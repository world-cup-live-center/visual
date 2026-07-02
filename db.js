// Postgres baglanti havuzu + sema kurulumu.
// DATABASE_URL yoksa uygulama yine acilir ama kimlik/preset uclari 503 doner.
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || "";
const useSsl = process.env.DATABASE_SSL === "true" || /sslmode=require/i.test(connectionString);

let pool = null;
let ready = false;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30000
  });
  pool.on("error", (err) => {
    console.error("[db] beklenmeyen havuz hatasi:", err.message);
  });
} else {
  console.warn("[db] DATABASE_URL tanimli degil — kimlik dogrulama devre disi. Railway'de PostgreSQL ekle.");
}

async function query(text, params) {
  if (!pool) {
    const err = new Error("Veritabani yapilandirilmamis.");
    err.code = "DB_UNCONFIGURED";
    throw err;
  }
  return pool.query(text, params);
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  provider       TEXT NOT NULL DEFAULT 'email',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin       BOOLEAN NOT NULL DEFAULT FALSE,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS email_codes (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  purpose    TEXT NOT NULL DEFAULT 'signup',
  expires_at TIMESTAMPTZ NOT NULL,
  consumed   BOOLEAN NOT NULL DEFAULT FALSE,
  attempts   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes (email);

CREATE TABLE IF NOT EXISTS presets (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- Abonelik paketleri (admin panelinden yonetilir)
CREATE TABLE IF NOT EXISTS plans (
  id                 BIGSERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  monthly_quota      INT NOT NULL DEFAULT 0,        -- ayda temiz (watermark'siz) export adedi
  price_monthly      NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly       NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'TRY',
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  is_default         BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order         INT NOT NULL DEFAULT 0,
  iyzico_ref_monthly TEXT,
  iyzico_ref_yearly  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kullanicinin etkin plani (null ise varsayilan plan gecerli)
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id BIGINT REFERENCES plans (id) ON DELETE SET NULL;

-- Donem bazli temiz export kullanimi (donem baslangici kayit tarihine gore)
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  clean_exports INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);

-- Genel ayarlar (iyzico anahtarlari vb. — panelden girilir)
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- iyzico'da olusturulan fiyat planinin, olusturuldugu andaki fiyat kopyasi.
-- Panelden fiyat degisirse yeni iyzico plani acilir (referans + kopya guncellenir).
ALTER TABLE plans ADD COLUMN IF NOT EXISTS iyzico_price_monthly NUMERIC(10,2);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS iyzico_price_yearly  NUMERIC(10,2);

-- Abonelikler (iyzico subscription karsiligi)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      BIGSERIAL PRIMARY KEY,
  user_id                 BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_id                 BIGINT REFERENCES plans (id) ON DELETE SET NULL,
  period                  TEXT NOT NULL DEFAULT 'monthly',      -- monthly | yearly
  status                  TEXT NOT NULL DEFAULT 'active',       -- active | canceled | unpaid | expired | superseded
  iyzico_subscription_ref TEXT,
  current_period_start    TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end      TIMESTAMPTZ,
  canceled_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ref  ON subscriptions (iyzico_subscription_ref);

-- Tek seferlik odeme modu: abonelik referansi olmaz, odeme kaydi tutulur.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS iyzico_payment_id TEXT;

-- Odeme formu oturumlari: iyzico callback'i cookie tasimadigindan token->kullanici esler.
CREATE TABLE IF NOT EXISTS checkout_sessions (
  token      TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_id    BIGINT NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  period     TEXT NOT NULL DEFAULT 'monthly',
  consumed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'onetime';
`;

// desc bos: arayuz "Aylık N temiz export" metnini kotadan turetir.
const SEED_PLANS = [
  { name: "Ücretsiz",  desc: "", quota: 5,  m: 0,   y: 0,    def: true,  order: 0 },
  { name: "Başlangıç", desc: "", quota: 10, m: 100, y: 1000, def: false, order: 1 },
  { name: "Pro",       desc: "", quota: 20, m: 175, y: 1750, def: false, order: 2 }
];

async function seedPlans() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM plans");
  if (rows[0].n > 0) return;
  for (const p of SEED_PLANS) {
    await pool.query(
      `INSERT INTO plans (name, description, monthly_quota, price_monthly, price_yearly, is_default, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [p.name, p.desc, p.quota, p.m, p.y, p.def, p.order]
    );
  }
  console.log("[db] varsayilan paketler olusturuldu.");
}

async function initSchema() {
  if (!pool) return false;
  await pool.query(SCHEMA_SQL);
  await seedPlans();
  // Otomatik turetilen kalip aciklamalari temizle: bos aciklama, arayuzde
  // "Aylık N temiz export" olarak kotadan turetilir (kota degisince guncel kalir).
  await pool.query(`UPDATE plans SET description = '' WHERE description ~ '^Ayl(ı|i)k [0-9]+ temiz export$'`);
  ready = true;
  console.log("[db] sema hazir.");
  return true;
}

function isReady() {
  return ready;
}

function isConfigured() {
  return Boolean(pool);
}

module.exports = { query, initSchema, isReady, isConfigured, pool };
