// Shopier odeme entegrasyonu (tek seferlik odeme, bireysel satici uyumlu).
// Akis: imzali form ile kullanici Shopier odeme sayfasina yonlendirilir;
// odeme sonrasi Shopier, panelde tanimli geri donus URL'ine (POST) imzali
// sonucu gonderir. Imza HMAC-SHA256 (base64) ile dogrulanir.
const crypto = require("crypto");
const db = require("../db");

const PAYMENT_URL = "https://www.shopier.com/ShowProduct/api_pay4.php";

async function getSetting(key) {
  const { rows } = await db.query("SELECT value FROM app_settings WHERE key = $1", [key]);
  return rows[0] ? rows[0].value : null;
}

async function getConfig() {
  const apiKey = ((await getSetting("shopier_api_key")) || "").trim();
  const secret = ((await getSetting("shopier_secret")) || "").trim();
  if (!apiKey || !secret) return null;
  const websiteIndex = ((await getSetting("shopier_website_index")) || "1").trim() || "1";
  return { apiKey, secret, websiteIndex };
}

async function isConfigured() {
  return Boolean(await getConfig());
}

function hmacBase64(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64");
}

// Odeme formu alanlarini uretir; istemci bu alanlarla formu olusturup
// Shopier'e POST eder (tam sayfa yonlendirme).
async function buildPaymentForm({ token, user, plan, period, price }) {
  const cfg = await getConfig();
  if (!cfg) {
    const err = new Error("Shopier anahtarlari girilmemis.");
    err.code = "SHOPIER_UNCONFIGURED";
    return Promise.reject(err);
  }

  const fullName = String(user.name || "Kullanici").trim();
  const parts = fullName.split(/\s+/);
  const firstName = parts[0] || "Kullanici";
  const lastName = parts.slice(1).join(" ") || firstName;

  const randomNr = String(crypto.randomInt(100000, 999999));
  const totalValue = Number(price).toFixed(2);
  const currency = "0"; // 0 = TL

  const signature = hmacBase64(randomNr + token + totalValue + currency, cfg.secret);

  const yearly = period === "yearly";
  const fields = {
    API_key: cfg.apiKey,
    website_index: cfg.websiteIndex,
    platform_order_id: token,
    product_name: `${plan.name} paketi (${yearly ? "yillik" : "aylik"})`,
    product_type: "1", // 1 = indirilebilir/sanal urun
    buyer_name: firstName,
    buyer_surname: lastName,
    buyer_email: user.email,
    buyer_account_age: "0",
    buyer_id_nr: "0",
    buyer_phone: "05000000000",
    billing_address: "Dijital teslimat",
    billing_city: "Istanbul",
    billing_country: "Turkiye",
    billing_postcode: "34000",
    shipping_address: "Dijital teslimat",
    shipping_city: "Istanbul",
    shipping_country: "Turkiye",
    shipping_postcode: "34000",
    total_order_value: totalValue,
    currency,
    platform: "0",
    is_in_frame: "0",
    current_language: "0", // 0 = TR
    modul_version: "1.0.4",
    random_nr: randomNr,
    signature
  };

  return { action: PAYMENT_URL, fields };
}

// Geri donus (callback) imzasini dogrular.
// Shopier: signature = base64( HMAC-SHA256( random_nr + platform_order_id, secret ) )
async function verifyCallback(body) {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: "Shopier yapilandirilmamis." };

  const orderId = String(body.platform_order_id || "");
  const randomNr = String(body.random_nr || "");
  const signature = String(body.signature || "");
  const status = String(body.status || "").toLowerCase();

  if (!orderId || !signature) return { ok: false, error: "Eksik callback verisi." };

  const expected = hmacBase64(randomNr + orderId, cfg.secret);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

  if (!valid) return { ok: false, error: "Imza dogrulanamadi." };
  if (status !== "success") return { ok: false, orderId, error: `Odeme durumu: ${status || "bilinmiyor"}` };

  return { ok: true, orderId, paymentId: body.payment_id ? String(body.payment_id) : null };
}

module.exports = { isConfigured, getConfig, buildPaymentForm, verifyCallback, PAYMENT_URL };
