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
`;

async function initSchema() {
  if (!pool) return false;
  await pool.query(SCHEMA_SQL);
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
