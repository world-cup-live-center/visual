// Kullanici tarafi plan/kota/odeme uclari.
const express = require("express");
const db = require("./../db");
const quota = require("./quota");
const iyzico = require("./iyzico");
const shopier = require("./shopier");
const crypto = require("crypto");
const { requireAuth } = require("./auth");

async function getSetting(key) {
  const { rows } = await db.query("SELECT value FROM app_settings WHERE key = $1", [key]);
  return rows[0] ? rows[0].value : null;
}

// Odeme dogrulaninca paketi aktive eder: eski aktif aboneligi kapatir,
// yeni donem satirini acar, kullanicinin planini gunceller, oturumu tuketir.
async function activateSession(session, { subRef = null, paymentId = null } = {}) {
  const now = new Date();
  const periodEnd = iyzico.addPeriod(now, session.period);

  const oldSubs = await db.query(
    "SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active'",
    [session.user_id]
  );
  for (const old of oldSubs.rows) {
    if (old.iyzico_subscription_ref && old.iyzico_subscription_ref !== subRef) {
      iyzico.cancelSubscription(old.iyzico_subscription_ref)
        .catch((e) => console.warn("[billing/activate] eski abonelik iptali:", e.message));
    }
    await db.query("UPDATE subscriptions SET status = 'superseded', updated_at = now() WHERE id = $1", [old.id]);
  }

  await db.query(
    `INSERT INTO subscriptions (user_id, plan_id, period, status, iyzico_subscription_ref, iyzico_payment_id, current_period_start, current_period_end)
     VALUES ($1, $2, $3, 'active', $4, $5, $6, $7)`,
    [session.user_id, session.plan_id, session.period, subRef, paymentId, now, periodEnd]
  );
  await db.query("UPDATE users SET plan_id = $1 WHERE id = $2", [session.plan_id, session.user_id]);
  await db.query("UPDATE checkout_sessions SET consumed = TRUE WHERE token = $1", [session.token]);
}

const router = express.Router();
const jsonBody = express.json({ limit: "64kb" });
const formBody = express.urlencoded({ extended: false, limit: "64kb" });

function requireDb(req, res, next) {
  if (!db.isConfigured()) {
    return res.status(503).json({ error: "Veritabani hazir degil.", code: "DB_UNCONFIGURED" });
  }
  next();
}

function baseUrl(req) {
  const fromEnv = (process.env.APP_URL || "").replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${proto}://${req.headers.host}`;
}

function resultRedirect(res, status, reason) {
  const q = reason ? `&reason=${encodeURIComponent(String(reason).slice(0, 160))}` : "";
  res.redirect(302, `/odeme-sonuc.html?status=${status}${q}`);
}

// Aktif paketlerin herkese acik listesi (fiyatlandirma icin).
router.get("/plans", requireDb, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, description, monthly_quota, price_monthly, price_yearly, currency, is_default, sort_order
       FROM plans WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC`
    );
    res.json({ plans: rows.map((p) => ({ ...p, id: Number(p.id) })) });
  } catch (error) {
    console.error("[billing/plans]", error.message);
    res.status(500).json({ error: "Paketler alinamadi." });
  }
});

// Giris yapan kullanicinin plani + kota durumu + abonelik bilgisi.
router.get("/me/plan", requireDb, requireAuth, async (req, res) => {
  try {
    const status = await quota.getQuotaStatus(req.authUser);
    const sub = await quota.getCurrentSubscription(req.authUser.id);
    let subscription = null;
    if (sub) {
      const endMs = sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
      if (endMs > Date.now() || sub.status === "active") {
        const autoRenew = Boolean(sub.iyzico_subscription_ref);
        subscription = {
          status: sub.status,
          period: sub.period,
          currentPeriodEnd: sub.current_period_end,
          autoRenew,
          cancelable: sub.status === "active" && autoRenew
        };
      }
    }
    res.json({
      plan: {
        id: status.plan.id ? Number(status.plan.id) : null,
        name: status.plan.name,
        monthlyQuota: status.quota,
        priceMonthly: Number(status.plan.price_monthly || 0),
        priceYearly: Number(status.plan.price_yearly || 0),
        currency: status.plan.currency || "TRY"
      },
      quota: status.quota,
      used: status.used,
      remaining: status.remaining,
      watermark: status.watermark,
      periodStart: quota.ymd(status.periodStart),
      subscription
    });
  } catch (error) {
    console.error("[billing/me-plan]", error.message);
    res.status(500).json({ error: "Plan bilgisi alinamadi." });
  }
});

// Odeme baslat: iyzico abonelik odeme formunu dondurur.
router.post("/checkout", jsonBody, requireDb, requireAuth, async (req, res) => {
  const planId = Number(req.body.planId);
  const period = req.body.period === "yearly" ? "yearly" : "monthly";
  try {
    const { rows } = await db.query("SELECT * FROM plans WHERE id = $1 AND is_active = TRUE", [planId]);
    const plan = rows[0];
    if (!plan) return res.status(404).json({ error: "Paket bulunamadi." });
    if (plan.is_default) return res.status(400).json({ error: "Bu paket zaten ucretsiz." });

    const provider = (await getSetting("payment_provider")) === "shopier" ? "shopier" : "iyzico";

    if (provider === "shopier") {
      // Shopier: imzali form ile tam sayfa yonlendirme; donus panelde tanimli
      // callback URL'ine gelir. Otomatik yenileme yoktur (donemlik satin alma).
      const price = Number(period === "yearly" ? plan.price_yearly : plan.price_monthly);
      if (!(price > 0)) return res.status(400).json({ error: "Bu paketin bu donem icin fiyati tanimli degil." });

      const token = crypto.randomBytes(16).toString("hex");
      const form = await shopier.buildPaymentForm({ token, user: req.authUser, plan, period, price });
      await db.query(
        `INSERT INTO checkout_sessions (token, user_id, plan_id, period, mode) VALUES ($1, $2, $3, $4, 'shopier')
         ON CONFLICT (token) DO NOTHING`,
        [token, req.authUser.id, plan.id, period]
      );
      return res.json({ ok: true, provider: "shopier", action: form.action, fields: form.fields });
    }

    const callbackUrl = `${baseUrl(req)}/api/checkout/callback`;

    // iyzico: Abonelik API'si aktifse yinelenen abonelik; degilse tek seferlik
    // odeme (donem sonunda otomatik yenileme yok, kullanici tekrar satin alir).
    const subscriptionMode = await iyzico.isSubscriptionEnabled();
    const mode = subscriptionMode ? "subscription" : "onetime";
    const form = subscriptionMode
      ? await iyzico.initializeCheckout(req.authUser, plan, period, callbackUrl)
      : await iyzico.initializeOneTimeCheckout(req.authUser, plan, period, callbackUrl, req.ip);

    // Callback cookie tasimaz; token -> kullanici eslemesini sakla.
    await db.query(
      `INSERT INTO checkout_sessions (token, user_id, plan_id, period, mode) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (token) DO NOTHING`,
      [form.token, req.authUser.id, plan.id, period, mode]
    );

    res.json({ ok: true, provider: "iyzico", token: form.token, checkoutFormContent: form.checkoutFormContent });
  } catch (error) {
    console.error("[billing/checkout]", error.message);
    if (error.code === "IYZICO_UNCONFIGURED" || error.code === "SHOPIER_UNCONFIGURED") {
      return res.status(503).json({ code: "PAYMENT_NOT_READY", error: "Ödeme sistemi henüz yapılandırılmadı. Yakında aktif olacak." });
    }
    // 502 kullanma: Railway edge 502 govdesini kendi hata sayfasiyla degistiriyor,
    // gercek mesaj tarayiciya ulasamiyor. 422 govdeyi aynen gecirir.
    res.status(422).json({ error: `Ödeme başlatılamadı: ${error.message}` });
  }
});

// iyzico odeme formu tamamlaninca kullanicinin tarayicisi buraya yonlenir (POST, cookie'siz).
async function handleCheckoutCallback(req, res) {
  const token = (req.body && req.body.token) || req.query.token;
  if (!token) return resultRedirect(res, "fail", "token yok");
  if (!db.isConfigured()) return resultRedirect(res, "fail", "veritabani hazir degil");

  try {
    const sessionQ = await db.query("SELECT * FROM checkout_sessions WHERE token = $1", [token]);
    const session = sessionQ.rows[0];
    if (!session) return resultRedirect(res, "fail", "oturum bulunamadi");
    if (session.consumed) return resultRedirect(res, "success");

    let subRef = null;      // iyzico abonelik referansi (abonelik modunda)
    let paymentId = null;   // tek seferlik odeme kaydi

    if (session.mode === "subscription") {
      const result = await iyzico.retrieveCheckout(token);
      console.log("[billing/callback] iyzico abonelik sonucu:", JSON.stringify(result.data).slice(0, 500));
      subRef = result.data.referenceCode || result.data.subscriptionReferenceCode || null;
      const remoteStatus = String(result.data.subscriptionStatus || "").toUpperCase();
      if (!result.ok || !subRef || (remoteStatus && remoteStatus !== "ACTIVE" && remoteStatus !== "PENDING")) {
        return resultRedirect(res, "fail", result.error || remoteStatus || "odeme tamamlanamadi");
      }
    } else {
      const result = await iyzico.retrieveOneTimeCheckout(token);
      console.log("[billing/callback] iyzico tek-seferlik sonucu:", JSON.stringify(result.data).slice(0, 500));
      if (!result.ok) {
        return resultRedirect(res, "fail", result.error || "odeme tamamlanamadi");
      }
      paymentId = result.data.paymentId ? String(result.data.paymentId) : null;
    }

    await activateSession(session, { subRef, paymentId });
    return resultRedirect(res, "success");
  } catch (error) {
    console.error("[billing/callback]", error.message);
    return resultRedirect(res, "fail", error.message);
  }
}
router.post("/checkout/callback", formBody, handleCheckoutCallback);
router.get("/checkout/callback", handleCheckoutCallback);

// Shopier geri donusu: kullanicinin tarayicisi POST eder (cookie'siz olabilir);
// imza dogrulanir, oturum token'i (platform_order_id) ile paket aktive edilir.
async function handleShopierCallback(req, res) {
  if (!db.isConfigured()) return resultRedirect(res, "fail", "veritabani hazir degil");
  try {
    const body = { ...(req.query || {}), ...(req.body || {}) };
    console.log("[shopier/callback]", JSON.stringify(body).slice(0, 400));
    const result = await shopier.verifyCallback(body);
    if (!result.ok) return resultRedirect(res, "fail", result.error);

    const sessionQ = await db.query("SELECT * FROM checkout_sessions WHERE token = $1", [result.orderId]);
    const session = sessionQ.rows[0];
    if (!session) return resultRedirect(res, "fail", "oturum bulunamadi");
    if (session.consumed) return resultRedirect(res, "success");

    await activateSession(session, { paymentId: result.paymentId });
    return resultRedirect(res, "success");
  } catch (error) {
    console.error("[shopier/callback]", error.message);
    return resultRedirect(res, "fail", error.message);
  }
}
router.post("/shopier/callback", formBody, handleShopierCallback);
router.get("/shopier/callback", handleShopierCallback);

// Kullanici aboneligini iptal eder; plan donem sonuna kadar aktif kalir.
router.post("/subscription/cancel", jsonBody, requireDb, requireAuth, async (req, res) => {
  try {
    const sub = await quota.getCurrentSubscription(req.authUser.id);
    if (!sub || sub.status !== "active") {
      return res.status(404).json({ error: "Aktif bir aboneligin yok." });
    }
    if (sub.iyzico_subscription_ref) {
      const result = await iyzico.cancelSubscription(sub.iyzico_subscription_ref);
      if (!result.ok) console.warn("[billing/cancel] iyzico:", result.error);
    }
    await db.query(
      "UPDATE subscriptions SET status = 'canceled', canceled_at = now(), updated_at = now() WHERE id = $1",
      [sub.id]
    );
    res.json({ ok: true, activeUntil: sub.current_period_end });
  } catch (error) {
    console.error("[billing/cancel]", error.message);
    res.status(500).json({ error: "Abonelik iptal edilemedi." });
  }
});

// iyzico webhook (merchant panelinden URL tanimlanirsa): olayi al, aboneligi esitle.
router.post("/iyzico/webhook", express.json({ limit: "64kb", type: () => true }), async (req, res) => {
  res.status(200).json({ ok: true }); // iyzico'ya hemen 200 don
  try {
    if (!db.isConfigured()) return;
    const body = req.body || {};
    const ref = body.subscriptionReferenceCode ||
      (body.data && body.data.subscriptionReferenceCode) || null;
    console.log("[iyzico/webhook]", JSON.stringify(body).slice(0, 400));
    if (!ref) return;
    const { rows } = await db.query("SELECT * FROM subscriptions WHERE iyzico_subscription_ref = $1", [ref]);
    if (rows[0]) await iyzico.syncSubscriptionRow(rows[0]);
  } catch (error) {
    console.warn("[iyzico/webhook]", error.message);
  }
});

module.exports = { router };
