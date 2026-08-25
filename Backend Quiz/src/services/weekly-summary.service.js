const { Op } = require("sequelize");
const { Payment, Plan, User, Session, JobRun } = require("../models");
const { sendWeeklySummaryEmail } = require("./email.service");

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const WEEKLY_SUMMARY_JOB = JobRun.WEEKLY_SUMMARY_JOB;

function toIstCalendarParts(date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds()
  };
}

/** Instant for YYYY-MM-DD 00:00:00 in Asia/Kolkata. */
function istMidnightUtc(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0) - IST_OFFSET_MS);
}

function formatYmd(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatYmdFromUtcInstant(instant) {
  const parts = toIstCalendarParts(instant);
  return formatYmd(parts.year, parts.month, parts.day);
}

function formatDisplayDate(instant) {
  return formatYmdFromUtcInstant(instant);
}

/**
 * Reporting window: previous Monday 00:00 IST → this Monday 00:00 IST.
 * runKey is this Monday's IST date (send week identifier).
 */
function getWeekBoundsIst(now = new Date()) {
  const parts = toIstCalendarParts(now);
  const dow = new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay();
  const daysSinceMonday = (dow + 6) % 7;
  const weekEnd = istMidnightUtc(parts.year, parts.month, parts.day - daysSinceMonday);
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    weekStart,
    weekEnd,
    runKey: formatYmdFromUtcInstant(weekEnd),
    todayIst: formatYmd(parts.year, parts.month, parts.day)
  };
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return formatYmd(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

function paiseToInr(paise) {
  return Number(paise || 0) / 100;
}

function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

async function buildWeeklySummary(now = new Date()) {
  const { weekStart, weekEnd, runKey, todayIst } = getWeekBoundsIst(now);
  const weekRange = { [Op.gte]: weekStart, [Op.lt]: weekEnd };
  const inSevenDays = addDaysYmd(todayIst, 7);

  const paidPayments = await Payment.findAll({
    where: {
      status: "paid",
      purpose: "plan_signup",
      paid_at: weekRange
    },
    include: [{ model: Plan, as: "plan", attributes: ["plan_id", "name"] }]
  });

  const purchasesByPlanMap = new Map();
  let revenuePaise = 0;
  let paidNotSignedUp = 0;

  for (const payment of paidPayments) {
    const planName = payment.plan?.name || `Plan #${payment.plan_id}`;
    const entry = purchasesByPlanMap.get(planName) || { planName, count: 0, revenuePaise: 0 };
    entry.count += 1;
    entry.revenuePaise += Number(payment.amount || 0);
    purchasesByPlanMap.set(planName, entry);
    revenuePaise += Number(payment.amount || 0);
    if (payment.user_id == null) paidNotSignedUp += 1;
  }

  const purchasesByPlan = [...purchasesByPlanMap.values()].sort((a, b) =>
    a.planName.localeCompare(b.planName)
  );

  const [
    failedPaymentsCount,
    newHostSignups,
    totalActiveUsers,
    totalPaidUsers,
    newPaidUsers,
    expiredPaidUsers,
    plansExpiringSoon,
    sessionsCreated
  ] = await Promise.all([
    Payment.count({
      where: {
        status: "failed",
        purpose: "plan_signup",
        failed_at: weekRange
      }
    }),
    User.count({
      where: {
        role: "host",
        created_at: weekRange
      }
    }),
    User.count({ where: { is_active: true } }),
    User.count({
      where: {
        is_active: true,
        [Op.or]: [{ plan_expires_at: null }, { plan_expires_at: { [Op.gte]: todayIst } }]
      },
      include: [
        {
          model: Plan,
          as: "plan",
          required: true,
          where: { is_free: false }
        }
      ]
    }),
    User.count({
      where: {
        role: "host",
        created_at: weekRange,
        [Op.or]: [{ plan_expires_at: null }, { plan_expires_at: { [Op.gte]: todayIst } }]
      },
      include: [
        {
          model: Plan,
          as: "plan",
          required: true,
          where: { is_free: false }
        }
      ]
    }),
    User.count({
      where: {
        is_active: true,
        plan_expires_at: {
          [Op.gte]: formatYmdFromUtcInstant(weekStart),
          [Op.lt]: formatYmdFromUtcInstant(weekEnd)
        }
      },
      include: [
        {
          model: Plan,
          as: "plan",
          required: true,
          where: { is_free: false }
        }
      ]
    }),
    User.count({
      where: {
        is_active: true,
        plan_expires_at: {
          [Op.gte]: todayIst,
          [Op.lte]: inSevenDays
        }
      },
      include: [
        {
          model: Plan,
          as: "plan",
          required: true,
          where: { is_free: false }
        }
      ]
    }),
    Session.count({
      where: {
        created_at: weekRange
      }
    })
  ]);

  const netPaidChange = newPaidUsers - expiredPaidUsers;
  const revenueInr = paiseToInr(revenuePaise);

  return {
    runKey,
    weekStart,
    weekEnd,
    weekStartLabel: formatDisplayDate(weekStart),
    weekEndLabel: formatDisplayDate(new Date(weekEnd.getTime() - 1000)),
    purchasesCount: paidPayments.length,
    purchasesByPlan: purchasesByPlan.map((row) => ({
      planName: row.planName,
      count: row.count,
      revenueInr: paiseToInr(row.revenuePaise),
      revenueLabel: formatInr(paiseToInr(row.revenuePaise))
    })),
    revenueInr,
    revenueLabel: formatInr(revenueInr),
    failedPaymentsCount,
    paidNotSignedUp,
    newHostSignups,
    totalActiveUsers,
    totalPaidUsers,
    newPaidUsers,
    expiredPaidUsers,
    netPaidChange,
    plansExpiringSoon,
    sessionsCreated
  };
}

async function hasJobRun(runKey) {
  const existing = await JobRun.findOne({
    where: { job_name: WEEKLY_SUMMARY_JOB, run_key: runKey }
  });
  return Boolean(existing);
}

async function recordJobRun(runKey, ranAt = new Date()) {
  try {
    await JobRun.create({
      job_name: WEEKLY_SUMMARY_JOB,
      run_key: runKey,
      ran_at: ranAt
    });
    return true;
  } catch (err) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      return false;
    }
    throw err;
  }
}

/**
 * @param {{ force?: boolean, now?: Date }} [options]
 * @returns {Promise<{ sent: boolean, skipped?: string, summary?: object }>}
 */
async function sendWeeklySummaryIfDue(options = {}) {
  const force = Boolean(options.force);
  const now = options.now || new Date();
  const summary = await buildWeeklySummary(now);

  if (!force && (await hasJobRun(summary.runKey))) {
    return { sent: false, skipped: "already_sent", summary };
  }

  await sendWeeklySummaryEmail(summary);

  const recorded = await recordJobRun(summary.runKey, now);
  if (!recorded && !force) {
    return { sent: false, skipped: "already_sent_race", summary };
  }

  return { sent: true, summary };
}

module.exports = {
  getWeekBoundsIst,
  buildWeeklySummary,
  sendWeeklySummaryIfDue,
  hasJobRun,
  recordJobRun,
  formatInr
};
