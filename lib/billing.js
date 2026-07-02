// Kullanici tarafi plan/kota uclari.
const express = require("express");
const db = require("./../db");
const quota = require("./quota");
const { requireAuth } = require("./auth");

const router = express.Router();

function requireDb(req, res, next) {
  if (!db.isConfigured()) {
    return res.status(503).json({ error: "Veritabani hazir degil.", code: "DB_UNCONFIGURED" });
  }
  next();
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

// Giris yapan kullanicinin plani + bu donem kota durumu.
router.get("/me/plan", requireDb, requireAuth, async (req, res) => {
  try {
    const status = await quota.getQuotaStatus(req.authUser);
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
      periodStart: quota.ymd(status.periodStart)
    });
  } catch (error) {
    console.error("[billing/me-plan]", error.message);
    res.status(500).json({ error: "Plan bilgisi alinamadi." });
  }
});

// Odeme baslatma. iyzico entegrasyonu Faz 2'de buraya gelecek; simdilik
// anahtar yoksa "yapilandirilmadi", varsa "yakinda" doner.
router.post("/checkout", express.json({ limit: "32kb" }), requireDb, requireAuth, async (req, res) => {
  const planId = Number(req.body.planId);
  const period = req.body.period === "yearly" ? "yearly" : "monthly";
  try {
    const { rows } = await db.query("SELECT id, name, price_monthly, price_yearly, is_default FROM plans WHERE id = $1 AND is_active = TRUE", [planId]);
    const plan = rows[0];
    if (!plan) return res.status(404).json({ error: "Paket bulunamadi." });
    if (plan.is_default) return res.status(400).json({ error: "Bu paket zaten ucretsiz." });

    const keyRow = await db.query("SELECT value FROM app_settings WHERE key = 'iyzico_api_key'");
    const configured = keyRow.rows[0] && keyRow.rows[0].value;
    return res.status(503).json({
      code: "PAYMENT_NOT_READY",
      error: configured
        ? "Ödeme entegrasyonu yakında aktifleşecek (Faz 2). Anahtarlar hazır."
        : "Ödeme henüz yapılandırılmadı. Yakında aktif olacak.",
      plan: { id: Number(plan.id), name: plan.name, period }
    });
  } catch (error) {
    console.error("[billing/checkout]", error.message);
    res.status(500).json({ error: "Ödeme baslatilamadi." });
  }
});

module.exports = { router };
