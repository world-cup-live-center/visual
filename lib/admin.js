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
             u.created_at, u.last_login_at,
             COALESCE(p.n, 0)::int AS preset_count
      FROM users u
      LEFT JOIN (SELECT user_id, COUNT(*) AS n FROM presets GROUP BY user_id) p ON p.user_id = u.id
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

module.exports = { router };
