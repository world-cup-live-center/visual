// Kota mantigi: etkin plan, donem hesabi (kayit tarihine gore), kullanim, watermark karari.
const db = require("./../db");

async function getDefaultPlan() {
  const def = await db.query(
    "SELECT * FROM plans WHERE is_default = TRUE AND is_active = TRUE ORDER BY id LIMIT 1"
  );
  if (def.rows[0]) return def.rows[0];
  const any = await db.query(
    "SELECT * FROM plans WHERE is_active = TRUE ORDER BY price_monthly ASC, id ASC LIMIT 1"
  );
  // Hic plan yoksa guvenli varsayilan (5 temiz export).
  return any.rows[0] || { id: null, name: "Ücretsiz", monthly_quota: 5, price_monthly: 0, price_yearly: 0, currency: "TRY" };
}

async function getEffectivePlan(user) {
  if (user && user.plan_id) {
    const { rows } = await db.query("SELECT * FROM plans WHERE id = $1 AND is_active = TRUE", [user.plan_id]);
    if (rows[0]) return rows[0];
  }
  return getDefaultPlan();
}

// Belirli bir gunu ay icinde gecerli gune kirparak UTC tarih dondurur.
function clampedUTC(year, month, day) {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, daysInMonth)));
}

// Donem baslangici: kayit tarihinin gunune gore, now'dan onceki en son o gun.
function currentPeriodStart(createdAt, now = new Date()) {
  const created = new Date(createdAt || now);
  const anchorDay = created.getUTCDate();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth();
  let cand = clampedUTC(y, m, anchorDay);
  if (cand.getTime() > now.getTime()) {
    m -= 1;
    if (m < 0) { m = 11; y -= 1; }
    cand = clampedUTC(y, m, anchorDay);
  }
  return cand;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

async function getUsedCount(userId, periodStart) {
  const { rows } = await db.query(
    "SELECT clean_exports FROM usage_counters WHERE user_id = $1 AND period_start = $2",
    [userId, ymd(periodStart)]
  );
  return rows[0] ? rows[0].clean_exports : 0;
}

// Kullanicinin kota durumu.
async function getQuotaStatus(user) {
  const plan = await getEffectivePlan(user);
  const periodStart = currentPeriodStart(user.created_at);
  const used = await getUsedCount(user.id, periodStart);
  const quota = Number(plan.monthly_quota) || 0;
  const remaining = Math.max(0, quota - used);
  return {
    plan,
    quota,
    used,
    remaining,
    watermark: used >= quota, // kota dolduysa sonraki export'lar filigranli
    periodStart
  };
}

async function incrementUsage(userId, periodStart) {
  await db.query(
    `INSERT INTO usage_counters (user_id, period_start, clean_exports)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, period_start)
     DO UPDATE SET clean_exports = usage_counters.clean_exports + 1, updated_at = now()`,
    [userId, ymd(periodStart)]
  );
}

module.exports = {
  getDefaultPlan,
  getEffectivePlan,
  currentPeriodStart,
  getQuotaStatus,
  incrementUsage,
  ymd
};
