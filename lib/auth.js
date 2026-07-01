// E-posta/sifre kimlik dogrulama: kayit, 6 haneli kod dogrulama, giris, cikis.
// Oturum: imzali JWT, httpOnly cookie icinde.
const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { sendVerificationCode, sendResetCode } = require("./mailer");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const COOKIE_NAME = "mos_session";
const SESSION_DAYS = 30;
const CODE_TTL_MIN = 15;
const MAX_CODE_ATTEMPTS = 6;

function isProd() {
  return /^https:\/\//i.test(process.env.APP_URL || "");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function signSession(user) {
  return jwt.sign(
    { uid: user.id, email: user.email, name: user.name, admin: user.is_admin },
    JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` }
  );
}

function setSessionCookie(res, user) {
  res.cookie(COOKIE_NAME, signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function publicUser(user) {
  return { id: Number(user.id), email: user.email, name: user.name, isAdmin: Boolean(user.is_admin) };
}

// --- Middleware ---
function readSession(req) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function attachUser(req, res, next) {
  req.authUser = null;
  const session = readSession(req);
  if (session && db.isConfigured()) {
    try {
      const { rows } = await db.query(
        "SELECT id, email, name, is_admin, status FROM users WHERE id = $1",
        [session.uid]
      );
      if (rows[0] && rows[0].status === "active") {
        req.authUser = rows[0];
      }
    } catch {
      req.authUser = null;
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ error: "Giris gerekli.", code: "UNAUTHENTICATED" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ error: "Giris gerekli.", code: "UNAUTHENTICATED" });
  }
  if (!req.authUser.is_admin) {
    return res.status(403).json({ error: "Yetki yok.", code: "FORBIDDEN" });
  }
  next();
}

function requireDb(req, res, next) {
  if (!db.isConfigured()) {
    return res.status(503).json({ error: "Veritabani hazir degil.", code: "DB_UNCONFIGURED" });
  }
  next();
}

// --- Rotalar ---

// Kayit: kullaniciyi dogrulanmamis olarak olustur/guncelle, kod gonder.
router.post("/register", requireDb, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const name = String(req.body.name || "").trim().slice(0, 80);
  const password = String(req.body.password || "");

  if (!validEmail(email)) return res.status(400).json({ error: "Gecerli bir e-posta gir." });
  if (name.length < 2) return res.status(400).json({ error: "Adini gir (en az 2 karakter)." });
  if (password.length < 8) return res.status(400).json({ error: "Sifre en az 8 karakter olmali." });

  try {
    const existing = await db.query("SELECT id, email_verified FROM users WHERE email = $1", [email]);
    if (existing.rows[0] && existing.rows[0].email_verified) {
      return res.status(409).json({ error: "Bu e-posta zaten kayitli. Giris yap." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    if (existing.rows[0]) {
      // Dogrulanmamis kayit — bilgileri guncelle.
      await db.query(
        "UPDATE users SET name = $1, password_hash = $2 WHERE id = $3",
        [name, passwordHash, existing.rows[0].id]
      );
    } else {
      await db.query(
        "INSERT INTO users (email, name, password_hash, provider, email_verified) VALUES ($1, $2, $3, 'email', FALSE)",
        [email, name, passwordHash]
      );
    }

    const code = generateCode();
    const expires = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);
    // Ayni e-posta icin eski kodlari temizle.
    await db.query("DELETE FROM email_codes WHERE email = $1 AND purpose = 'signup'", [email]);
    await db.query(
      "INSERT INTO email_codes (email, code, purpose, expires_at) VALUES ($1, $2, 'signup', $3)",
      [email, code, expires]
    );

    const mail = await sendVerificationCode(email, code);
    return res.json({ ok: true, emailDelivered: mail.delivered !== false });
  } catch (error) {
    console.error("[auth/register]", error.message);
    return res.status(500).json({ error: "Kayit sirasinda hata olustu." });
  }
});

// Kodu tekrar gonder.
router.post("/resend", requireDb, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!validEmail(email)) return res.status(400).json({ error: "Gecerli bir e-posta gir." });
  try {
    const user = await db.query("SELECT email_verified FROM users WHERE email = $1", [email]);
    if (!user.rows[0]) return res.status(404).json({ error: "Once kayit ol." });
    if (user.rows[0].email_verified) return res.status(400).json({ error: "Hesap zaten dogrulanmis. Giris yap." });

    const code = generateCode();
    const expires = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);
    await db.query("DELETE FROM email_codes WHERE email = $1 AND purpose = 'signup'", [email]);
    await db.query(
      "INSERT INTO email_codes (email, code, purpose, expires_at) VALUES ($1, $2, 'signup', $3)",
      [email, code, expires]
    );
    const mail = await sendVerificationCode(email, code);
    return res.json({ ok: true, emailDelivered: mail.delivered !== false });
  } catch (error) {
    console.error("[auth/resend]", error.message);
    return res.status(500).json({ error: "Kod gonderilemedi." });
  }
});

// Kodu dogrula: hesabi aktiflestir, otomatik giris yap.
router.post("/verify", requireDb, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "").trim();
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "E-posta ve 6 haneli kodu gir." });
  }

  try {
    const row = await db.query(
      "SELECT id, code, expires_at, consumed, attempts FROM email_codes WHERE email = $1 AND purpose = 'signup' ORDER BY id DESC LIMIT 1",
      [email]
    );
    const rec = row.rows[0];
    if (!rec || rec.consumed) return res.status(400).json({ error: "Kod bulunamadi. Yeni kod iste." });
    if (rec.attempts >= MAX_CODE_ATTEMPTS) return res.status(429).json({ error: "Cok fazla deneme. Yeni kod iste." });
    if (new Date(rec.expires_at).getTime() < Date.now()) return res.status(400).json({ error: "Kodun suresi doldu. Yeni kod iste." });

    if (rec.code !== code) {
      await db.query("UPDATE email_codes SET attempts = attempts + 1 WHERE id = $1", [rec.id]);
      return res.status(400).json({ error: "Kod hatali." });
    }

    await db.query("UPDATE email_codes SET consumed = TRUE WHERE id = $1", [rec.id]);
    const makeAdmin = ADMIN_EMAIL && email === ADMIN_EMAIL;
    const upd = await db.query(
      "UPDATE users SET email_verified = TRUE, is_admin = is_admin OR $2, last_login_at = now() WHERE email = $1 RETURNING id, email, name, is_admin",
      [email, makeAdmin]
    );
    const user = upd.rows[0];
    setSessionCookie(res, user);
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    console.error("[auth/verify]", error.message);
    return res.status(500).json({ error: "Dogrulama sirasinda hata olustu." });
  }
});

// Giris.
router.post("/login", requireDb, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  if (!validEmail(email) || !password) return res.status(400).json({ error: "E-posta ve sifre gir." });

  try {
    const { rows } = await db.query(
      "SELECT id, email, name, password_hash, email_verified, is_admin, status FROM users WHERE email = $1",
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "E-posta veya sifre hatali." });
    if (user.status === "banned") return res.status(403).json({ error: "Hesabin askiya alinmis." });
    if (!user.email_verified) {
      return res.status(403).json({ error: "Once e-postani dogrula.", code: "UNVERIFIED", email });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "E-posta veya sifre hatali." });

    await db.query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
    setSessionCookie(res, user);
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    console.error("[auth/login]", error.message);
    return res.status(500).json({ error: "Giris sirasinda hata olustu." });
  }
});

// Sifremi unuttum: dogrulanmis kullaniciya sifirlama kodu gonder.
// Kullanici yoksa da ok doner (e-posta enumerasyonunu engellemek icin).
router.post("/forgot", requireDb, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!validEmail(email)) return res.status(400).json({ error: "Gecerli bir e-posta gir." });
  try {
    const user = await db.query("SELECT id, email_verified FROM users WHERE email = $1", [email]);
    let emailDelivered = false;
    if (user.rows[0] && user.rows[0].email_verified) {
      const code = generateCode();
      const expires = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);
      await db.query("DELETE FROM email_codes WHERE email = $1 AND purpose = 'reset'", [email]);
      await db.query(
        "INSERT INTO email_codes (email, code, purpose, expires_at) VALUES ($1, $2, 'reset', $3)",
        [email, code, expires]
      );
      const mail = await sendResetCode(email, code);
      emailDelivered = mail.delivered !== false;
    }
    return res.json({ ok: true, emailDelivered });
  } catch (error) {
    console.error("[auth/forgot]", error.message);
    return res.status(500).json({ error: "Islem sirasinda hata olustu." });
  }
});

// Sifirlama kodunu dogrula ve yeni sifreyi ayarla, otomatik giris yap.
router.post("/reset", requireDb, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "").trim();
  const password = String(req.body.password || "");
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "E-posta ve 6 haneli kodu gir." });
  }
  if (password.length < 8) return res.status(400).json({ error: "Yeni sifre en az 8 karakter olmali." });

  try {
    const row = await db.query(
      "SELECT id, code, expires_at, consumed, attempts FROM email_codes WHERE email = $1 AND purpose = 'reset' ORDER BY id DESC LIMIT 1",
      [email]
    );
    const rec = row.rows[0];
    if (!rec || rec.consumed) return res.status(400).json({ error: "Kod bulunamadi. Yeni kod iste." });
    if (rec.attempts >= MAX_CODE_ATTEMPTS) return res.status(429).json({ error: "Cok fazla deneme. Yeni kod iste." });
    if (new Date(rec.expires_at).getTime() < Date.now()) return res.status(400).json({ error: "Kodun suresi doldu. Yeni kod iste." });
    if (rec.code !== code) {
      await db.query("UPDATE email_codes SET attempts = attempts + 1 WHERE id = $1", [rec.id]);
      return res.status(400).json({ error: "Kod hatali." });
    }

    await db.query("UPDATE email_codes SET consumed = TRUE WHERE id = $1", [rec.id]);
    const passwordHash = await bcrypt.hash(password, 10);
    const upd = await db.query(
      "UPDATE users SET password_hash = $1, last_login_at = now() WHERE email = $2 RETURNING id, email, name, is_admin",
      [passwordHash, email]
    );
    const user = upd.rows[0];
    if (!user) return res.status(400).json({ error: "Kullanici bulunamadi." });
    setSessionCookie(res, user);
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    console.error("[auth/reset]", error.message);
    return res.status(500).json({ error: "Sifre sifirlanamadi." });
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  if (!req.authUser) return res.json({ user: null });
  res.json({ user: publicUser(req.authUser) });
});

module.exports = { router, attachUser, requireAuth, requireAdmin };
