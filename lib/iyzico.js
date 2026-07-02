// iyzico abonelik entegrasyonu.
// Anahtarlar admin panelinden app_settings'e yazilir (iyzico_api_key,
// iyzico_secret, iyzico_sandbox). Urun + fiyat planlari iyzico'da talep aninda
// olusturulur; referanslar plans tablosuna, urun referansi app_settings'e yazilir.
const Iyzipay = require("iyzipay");
const db = require("../db");

const SANDBOX_URI = "https://sandbox-api.iyzipay.com";
const LIVE_URI = "https://api.iyzipay.com";

async function getSetting(key) {
  const { rows } = await db.query("SELECT value FROM app_settings WHERE key = $1", [key]);
  return rows[0] ? rows[0].value : null;
}

async function setSetting(key, value) {
  await db.query(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );
}

async function getConfig() {
  const apiKey = (await getSetting("iyzico_api_key")) || "";
  const secret = (await getSetting("iyzico_secret")) || "";
  const sandbox = (await getSetting("iyzico_sandbox")) !== "false";
  if (!apiKey.trim() || !secret.trim()) return null;
  return { apiKey: apiKey.trim(), secret: secret.trim(), sandbox, uri: sandbox ? SANDBOX_URI : LIVE_URI };
}

let cachedClient = null;
let cachedKey = "";

async function getClient() {
  const cfg = await getConfig();
  if (!cfg) return null;
  const key = `${cfg.apiKey}|${cfg.secret}|${cfg.uri}`;
  if (!cachedClient || cachedKey !== key) {
    cachedClient = new Iyzipay({ apiKey: cfg.apiKey, secretKey: cfg.secret, uri: cfg.uri });
    cachedKey = key;
  }
  return cachedClient;
}

function unconfiguredError() {
  const err = new Error("Ödeme sistemi henüz yapılandırılmadı (iyzico anahtarları eksik).");
  err.code = "IYZICO_UNCONFIGURED";
  return err;
}

// SDK callback tabanli; Promise sarmalayici.
function call(resource, method, params) {
  return new Promise((resolve, reject) => {
    try {
      resource[method](params, (err, result) => {
        if (err) {
          reject(new Error(typeof err === "string" ? err : err.message || "iyzico istegi basarisiz."));
          return;
        }
        resolve(result);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function ok(res) {
  return res && res.status === "success";
}

// v2 uclari yaniti data icinde sarar; savunmaci oku.
function payload(res) {
  return (res && res.data) || res || {};
}

function errMsg(res) {
  return (res && (res.errorMessage || res.errorCode)) || "iyzico islemi basarisiz.";
}

// Sandbox <-> canli gecisinde eski referanslar gecersizdir; temizle.
async function ensureEnvRefs(cfg) {
  const env = cfg.sandbox ? "sandbox" : "live";
  const current = await getSetting("iyzico_refs_env");
  if (current !== env) {
    await db.query(
      "UPDATE plans SET iyzico_ref_monthly = NULL, iyzico_ref_yearly = NULL, iyzico_price_monthly = NULL, iyzico_price_yearly = NULL"
    );
    await setSetting("iyzico_product_ref", "");
    await setSetting("iyzico_refs_env", env);
    console.log(`[iyzico] ortam degisti -> ${env}; plan referanslari sifirlandi.`);
  }
}

async function ensureProduct(client) {
  let ref = await getSetting("iyzico_product_ref");
  if (ref) return ref;
  const res = await call(client.subscriptionProduct, "create", {
    locale: "tr",
    conversationId: `prod-${Date.now()}`,
    name: "MoS Rhythm",
    description: "MoS Rhythm abonelik paketleri"
  });
  if (!ok(res)) throw new Error(errMsg(res));
  ref = payload(res).referenceCode;
  if (!ref) throw new Error("iyzico urun referansi alinamadi.");
  await setSetting("iyzico_product_ref", ref);
  return ref;
}

// Plan+donem icin iyzico fiyat plani referansini garantiler.
// Fiyat panelden degistiyse yeni plan olusturur (iyzico plan fiyati guncellenemez varsayimi).
async function ensurePricingPlan(plan, period) {
  const client = await getClient();
  if (!client) throw unconfiguredError();
  const cfg = await getConfig();
  await ensureEnvRefs(cfg);

  const yearly = period === "yearly";
  const price = Number(yearly ? plan.price_yearly : plan.price_monthly);
  if (!(price > 0)) {
    throw new Error(yearly ? "Bu paketin yillik fiyati tanimli degil." : "Bu paketin aylik fiyati tanimli degil.");
  }
  const refCol = yearly ? "iyzico_ref_yearly" : "iyzico_ref_monthly";
  const snapCol = yearly ? "iyzico_price_yearly" : "iyzico_price_monthly";
  if (plan[refCol] && Number(plan[snapCol]) === price) return plan[refCol];

  const productRef = await ensureProduct(client);
  const res = await call(client.subscriptionPricingPlan, "create", {
    locale: "tr",
    conversationId: `plan-${plan.id}-${Date.now()}`,
    productReferenceCode: productRef,
    name: `${plan.name} ${yearly ? "Yillik" : "Aylik"} ${price}TL`,
    price: String(price),
    currencyCode: "TRY",
    paymentInterval: yearly ? "YEARLY" : "MONTHLY",
    paymentIntervalCount: 1,
    planPaymentType: "RECURRING"
  });
  if (!ok(res)) throw new Error(errMsg(res));
  const ref = payload(res).referenceCode;
  if (!ref) throw new Error("iyzico fiyat plani referansi alinamadi.");
  await db.query(
    `UPDATE plans SET ${refCol} = $1, ${snapCol} = $2 WHERE id = $3`,
    [ref, price, plan.id]
  );
  return ref;
}

// Odeme formunu baslatir; { token, checkoutFormContent } doner.
// Not: iyzico abonelik musterisi icin fatura adresi zorunlu; dijital urun
// oldugundan yer tutucu adres kullanilir (canliya gecerken gercek fatura
// bilgisi formu eklenmeli).
async function initializeCheckout(user, plan, period, callbackUrl) {
  const pricingRef = await ensurePricingPlan(plan, period);
  const client = await getClient();
  if (!client) throw unconfiguredError();

  const fullName = String(user.name || "Kullanici").trim();
  const parts = fullName.split(/\s+/);
  const firstName = parts[0] || "Kullanici";
  const lastName = parts.slice(1).join(" ") || firstName;
  const address = {
    contactName: fullName,
    city: "Istanbul",
    country: "Turkey",
    address: "Dijital teslimat",
    zipCode: "34000"
  };

  const res = await call(client.subscriptionCheckoutForm, "initialize", {
    locale: "tr",
    conversationId: `chk-${user.id}-${Date.now()}`,
    callbackUrl,
    pricingPlanReferenceCode: pricingRef,
    subscriptionInitialStatus: "ACTIVE",
    customer: {
      name: firstName,
      surname: lastName,
      email: user.email,
      gsmNumber: "+905350000000",
      identityNumber: "11111111111",
      billingAddress: address,
      shippingAddress: address
    }
  });
  if (!ok(res)) throw new Error(errMsg(res));
  const d = payload(res);
  if (!d.token || !d.checkoutFormContent) throw new Error("iyzico odeme formu baslatilamadi.");
  return { token: d.token, checkoutFormContent: d.checkoutFormContent };
}

// Callback'te formun sonucunu getirir.
async function retrieveCheckout(token) {
  const client = await getClient();
  if (!client) throw unconfiguredError();
  const res = await call(client.subscriptionCheckoutForm, "retrieve", { checkoutFormToken: token });
  return { ok: ok(res), data: payload(res), error: ok(res) ? null : errMsg(res) };
}

async function retrieveSubscription(subscriptionReferenceCode) {
  const client = await getClient();
  if (!client) throw unconfiguredError();
  const res = await call(client.subscription, "retrieve", { subscriptionReferenceCode });
  return { ok: ok(res), data: payload(res), error: ok(res) ? null : errMsg(res) };
}

async function cancelSubscription(subscriptionReferenceCode) {
  const client = await getClient();
  if (!client) throw unconfiguredError();
  const res = await call(client.subscription, "cancel", { subscriptionReferenceCode });
  return { ok: ok(res), data: payload(res), error: ok(res) ? null : errMsg(res) };
}

// Donem sonuna ayni gunu koruyarak 1 ay/yil ekler (ay sonu kirpmali).
function addPeriod(date, period) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const targetY = period === "yearly" ? y + 1 : y;
  const targetM = period === "yearly" ? m : m + 1;
  const daysInTarget = new Date(Date.UTC(targetY, targetM + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetY, targetM, Math.min(day, daysInTarget), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
}

// Suresi gecmis bir abonelik satirini iyzico ile esitler:
// ACTIVE ise donemi bugunu kapsayana dek uzatir; degilse dusurur.
async function syncSubscriptionRow(subRow) {
  if (!subRow || !subRow.iyzico_subscription_ref) return;
  let result;
  try {
    result = await retrieveSubscription(subRow.iyzico_subscription_ref);
  } catch (error) {
    console.warn("[iyzico/sync] sorgu basarisiz:", error.message);
    return;
  }

  const remoteStatus = String((result.data && result.data.subscriptionStatus) || "").toUpperCase();

  if (result.ok && remoteStatus === "ACTIVE") {
    let start = new Date(subRow.current_period_start);
    let end = subRow.current_period_end ? new Date(subRow.current_period_end) : addPeriod(start, subRow.period);
    const now = new Date();
    while (end.getTime() <= now.getTime()) {
      start = end;
      end = addPeriod(end, subRow.period);
    }
    await db.query(
      "UPDATE subscriptions SET status = 'active', current_period_start = $1, current_period_end = $2, updated_at = now() WHERE id = $3",
      [start, end, subRow.id]
    );
    await db.query("UPDATE users SET plan_id = $1 WHERE id = $2", [subRow.plan_id, subRow.user_id]);
    console.log(`[iyzico/sync] abonelik ${subRow.id} yenilendi -> ${end.toISOString()}`);
    return;
  }

  // Aktif degil: yerelde isaretle; donem de bittiyse kullaniciyi varsayilana dusur.
  const mapped = remoteStatus === "UNPAID" ? "unpaid" : remoteStatus === "CANCELED" ? "canceled" : "expired";
  await db.query("UPDATE subscriptions SET status = $1, updated_at = now() WHERE id = $2", [mapped, subRow.id]);
  const ended = !subRow.current_period_end || new Date(subRow.current_period_end).getTime() <= Date.now();
  if (ended) {
    await db.query("UPDATE users SET plan_id = NULL WHERE id = $1 AND plan_id = $2", [subRow.user_id, subRow.plan_id]);
    console.log(`[iyzico/sync] abonelik ${subRow.id} sonlandi (${mapped}); kullanici varsayilana dustu.`);
  }
}

async function isConfigured() {
  return Boolean(await getConfig());
}

// Anahtarlari dogrulamak icin zararsiz, kimlik dogrulamali bir cagri yapar.
async function testConnection() {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: "API anahtarlari girilmemis." };
  const client = await getClient();
  try {
    const res = await call(client.subscriptionProduct, "retrieveList", {
      locale: "tr",
      conversationId: `test-${Date.now()}`,
      page: 1,
      count: 1
    });
    return {
      ok: ok(res),
      env: cfg.sandbox ? "sandbox" : "live",
      uri: cfg.uri,
      error: ok(res) ? null : errMsg(res),
      raw: res
    };
  } catch (error) {
    return { ok: false, env: cfg.sandbox ? "sandbox" : "live", uri: cfg.uri, error: error.message };
  }
}

module.exports = {
  getClient,
  getConfig,
  isConfigured,
  testConnection,
  ensurePricingPlan,
  initializeCheckout,
  retrieveCheckout,
  retrieveSubscription,
  cancelSubscription,
  addPeriod,
  syncSubscriptionRow
};
