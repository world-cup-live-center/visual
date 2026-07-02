// Admin ucları — sadece is_admin kullanicilar.
const express = require("express");
const db = require("../db");
const { requireAdmin } = require("./auth");

const router = express.Router();
router.use(requireAdmin);

// Ozet istatistikler.
router.get("/stats", async (req, res) => {
  try {
    const totals = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE email_verified)::int AS verified,
        COUNT(*) FILTER (WHERE status = 'banned')::int AS banned,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last7
      FROM users
    `);
    const presets = await db.query("SELECT COUNT(*)::int AS n FROM presets");
    res.json({ ...totals.rows[0], presets: presets.rows[0].n });
  } catch (error) {
    console.error("[admin/stats]", error.message);
    res.status(500).json({ error: "Istatistikler alinamadi." });
  }
});

// Kullanici listesi (preset sayilariyla).
router.get("/users", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.email, u.name, u.provider, u.email_verified, u.is_admin, u.status,
             u.created_at, u.last_login_at, u.plan_id, pl.name AS plan_name,
             COALESCE(p.n, 0)::int AS preset_count
      FROM users u
      LEFT JOIN (SELECT user_id, COUNT(*) AS n FROM presets GROUP BY user_id) p ON p.user_id = u.id
      LEFT JOIN plans pl ON pl.id = u.plan_id
      ORDER BY u.created_at DESC
    `);
    res.json({ users: rows.map((r) => ({ ...r, id: Number(r.id) })) });
  } catch (error) {
    console.error("[admin/users]", error.message);
    res.status(500).json({ error: "Kullanicilar alinamadi." });
  }
});

// Bir kullanicinin preset'leri.
router.get("/users/:id/presets", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT name, data, updated_at FROM presets WHERE user_id = $1 ORDER BY updated_at DESC",
      [req.params.id]
    );
    res.json({ presets: rows });
  } catch (error) {
    console.error("[admin/user-presets]", error.message);
    res.status(500).json({ error: "Preset'ler alinamadi." });
  }
});

function guardSelf(req, res, targetId) {
  if (Number(targetId) === Number(req.authUser.id)) {
    res.status(400).json({ error: "Kendi hesabinda bu islemi yapamazsin." });
    return false;
  }
  return true;
}

// Ban / aktif et.
router.post("/users/:id/status", async (req, res) => {
  const status = req.body.status === "banned" ? "banned" : "active";
  if (status === "banned" && !guardSelf(req, res, req.params.id)) return;
  try {
    await db.query("UPDATE users SET status = $1 WHERE id = $2", [status, req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error("[admin/status]", error.message);
    res.status(500).json({ error: "Durum guncellenemedi." });
  }
});

// Admin yetkisi ver / al.
router.post("/users/:id/admin", async (req, res) => {
  const makeAdmin = Boolean(req.body.isAdmin);
  if (!makeAdmin && !guardSelf(req, res, req.params.id)) return;
  try {
    await db.query("UPDATE users SET is_admin = $1 WHERE id = $2", [makeAdmin, req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error("[admin/admin-flag]", error.message);
    res.status(500).json({ error: "Yetki guncellenemedi." });
  }
});

// Kullaniciyi sil.
router.delete("/users/:id", async (req, res) => {
  if (!guardSelf(req, res, req.params.id)) return;
  try {
    await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error("[admin/delete]", error.message);
    res.status(500).json({ error: "Kullanici silinemedi." });
  }
});

// ─── Paketler (planlar) ──────────────────────────────────────────────────────

function parsePlanBody(body) {
  const num = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : d;
  };
  return {
    name: String(body.name || "").trim().slice(0, 60),
    description: String(body.description || "").trim().slice(0, 200),
    monthly_quota: Math.round(num(body.monthlyQuota)),
    price_monthly: num(body.priceMonthly),
    price_yearly: num(body.priceYearly),
    is_active: body.isActive !== false,
    is_default: Boolean(body.isDefault),
    sort_order: Math.round(num(body.sortOrder))
  };
}

// Tum paketler (pasifler dahil).
router.get("/plans", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, COALESCE(u.n, 0)::int AS subscriber_count
      FROM plans p
      LEFT JOIN (SELECT plan_id, COUNT(*) AS n FROM users WHERE plan_id IS NOT NULL GROUP BY plan_id) u
        ON u.plan_id = p.id
      ORDER BY p.sort_order ASC, p.id ASC
    `);
    res.json({ plans: rows.map((p) => ({ ...p, id: Number(p.id) })) });
  } catch (error) {
    console.error("[admin/plans]", error.message);
    res.status(500).json({ error: "Paketler alinamadi." });
  }
});

// Paket olustur.
router.post("/plans", async (req, res) => {
  const p = parsePlanBody(req.body);
  if (p.name.length < 2) return res.status(400).json({ error: "Paket adi gerekli." });
  try {
    if (p.is_default) await db.query("UPDATE plans SET is_default = FALSE");
    const { rows } = await db.query(
      `INSERT INTO plans (name, description, monthly_quota, price_monthly, price_yearly, is_active, is_default, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [p.name, p.description, p.monthly_quota, p.price_monthly, p.price_yearly, p.is_active, p.is_default, p.sort_order]
    );
    res.json({ ok: true, id: Number(rows[0].id) });
  } catch (error) {
    console.error("[admin/plans/create]", error.message);
    res.status(500).json({ error: "Paket olusturulamadi." });
  }
});

// Paket guncelle.
router.put("/plans/:id", async (req, res) => {
  const p = parsePlanBody(req.body);
  if (p.name.length < 2) return res.status(400).json({ error: "Paket adi gerekli." });
  try {
    if (p.is_default) await db.query("UPDATE plans SET is_default = FALSE WHERE id <> $1", [req.params.id]);
    await db.query(
      `UPDATE plans SET name=$1, description=$2, monthly_quota=$3, price_monthly=$4, price_yearly=$5,
       is_active=$6, is_default=$7, sort_order=$8 WHERE id=$9`,
      [p.name, p.description, p.monthly_quota, p.price_monthly, p.price_yearly, p.is_active, p.is_default, p.sort_order, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("[admin/plans/update]", error.message);
    res.status(500).json({ error: "Paket guncellenemedi." });
  }
});

// Varsayilan yap.
router.post("/plans/:id/default", async (req, res) => {
  try {
    await db.query("UPDATE plans SET is_default = FALSE");
    await db.query("UPDATE plans SET is_default = TRUE, is_active = TRUE WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error("[admin/plans/default]", error.message);
    res.status(500).json({ error: "Varsayilan ayarlanamadi." });
  }
});

// Paket sil (varsayilan silinemez).
router.delete("/plans/:id", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT is_default FROM plans WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Paket bulunamadi." });
    if (rows[0].is_default) return res.status(400).json({ error: "Varsayilan paket silinemez. Once baska bir paketi varsayilan yap." });
    await db.query("DELETE FROM plans WHERE id = $1", [req.params.id]); // users.plan_id -> NULL (varsayilana duser)
    res.json({ ok: true });
  } catch (error) {
    console.error("[admin/plans/delete]", error.message);
    res.status(500).json({ error: "Paket silinemedi." });
  }
});

// ─── Odeme ayarlari (iyzico) ─────────────────────────────────────────────────
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

router.get("/settings", async (req, res) => {
  try {
    const apiKey = (await getSetting("iyzico_api_key")) || "";
    const secret = (await getSetting("iyzico_secret")) || "";
    const sandbox = (await getSetting("iyzico_sandbox")) !== "false"; // varsayilan: sandbox
    res.json({
      iyzico: {
        apiKey,
        secretSet: Boolean(secret),
        secretHint: secret ? "••••" + secret.slice(-4) : "",
        sandbox
      }
    });
  } catch (error) {
    console.error("[admin/settings/get]", error.message);
    res.status(500).json({ error: "Ayarlar alinamadi." });
  }
});

// iyzico baglanti testi: anahtarlarla zararsiz bir listeleme cagrisi yapar.
router.get("/settings/test-iyzico", async (req, res) => {
  try {
    const iyzico = require("./iyzico");
    const result = await iyzico.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/settings", async (req, res) => {
  const b = req.body || {};
  try {
    if (typeof b.apiKey === "string") await setSetting("iyzico_api_key", b.apiKey.trim());
    // Secret yalnizca yeni bir deger girildiyse guncellenir (maskeli goruntuyu ezmemek icin).
    if (typeof b.secret === "string" && b.secret.trim()) await setSetting("iyzico_secret", b.secret.trim());
    await setSetting("iyzico_sandbox", b.sandbox ? "true" : "false");
    res.json({ ok: true });
  } catch (error) {
    console.error("[admin/settings/post]", error.message);
    res.status(500).json({ error: "Ayarlar kaydedilemedi." });
  }
});

// Kullaniciya plan ata (null => varsayilan).
router.put("/users/:id/plan", async (req, res) => {
  const planId = req.body.planId == null ? null : Number(req.body.planId);
  try {
    if (planId !== null) {
      const chk = await db.query("SELECT 1 FROM plans WHERE id = $1", [planId]);
      if (!chk.rows[0]) return res.status(400).json({ error: "Plan bulunamadi." });
    }
    await db.query("UPDATE users SET plan_id = $1 WHERE id = $2", [planId, req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error("[admin/users/plan]", error.message);
    res.status(500).json({ error: "Plan atanamadi." });
  }
});

module.exports = { router };
