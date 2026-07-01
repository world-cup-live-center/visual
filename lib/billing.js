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

module.exports = { router };
