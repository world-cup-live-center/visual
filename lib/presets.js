// Kisiye ozel preset'ler — giris zorunlu.
const express = require("express");
const db = require("../db");
const { requireAuth } = require("./auth");

const router = express.Router();
const MAX_PRESETS = 100;

router.use(requireAuth);

// Kullanicinin tum preset'leri.
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT name, data FROM presets WHERE user_id = $1 ORDER BY updated_at DESC",
      [req.authUser.id]
    );
    const presets = {};
    for (const row of rows) presets[row.name] = row.data;
    res.json({ presets });
  } catch (error) {
    console.error("[presets/list]", error.message);
    res.status(500).json({ error: "Preset'ler yuklenemedi." });
  }
});

// Preset kaydet/guncelle (isim bazli upsert).
router.post("/", async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 60);
  const data = req.body.data;
  if (!name) return res.status(400).json({ error: "Preset adi gerekli." });
  if (data === null || typeof data !== "object") return res.status(400).json({ error: "Preset verisi gecersiz." });

  try {
    const count = await db.query("SELECT COUNT(*)::int AS n FROM presets WHERE user_id = $1", [req.authUser.id]);
    const exists = await db.query("SELECT 1 FROM presets WHERE user_id = $1 AND name = $2", [req.authUser.id, name]);
    if (!exists.rows[0] && count.rows[0].n >= MAX_PRESETS) {
      return res.status(400).json({ error: `En fazla ${MAX_PRESETS} preset saklanabilir.` });
    }
    await db.query(
      `INSERT INTO presets (user_id, name, data) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, name) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [req.authUser.id, name, data]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("[presets/save]", error.message);
    res.status(500).json({ error: "Preset kaydedilemedi." });
  }
});

// Preset sil (isim yol parametresinde).
router.delete("/:name", async (req, res) => {
  const name = String(req.params.name || "");
  try {
    await db.query("DELETE FROM presets WHERE user_id = $1 AND name = $2", [req.authUser.id, name]);
    res.json({ ok: true });
  } catch (error) {
    console.error("[presets/delete]", error.message);
    res.status(500).json({ error: "Preset silinemedi." });
  }
});

module.exports = { router };
