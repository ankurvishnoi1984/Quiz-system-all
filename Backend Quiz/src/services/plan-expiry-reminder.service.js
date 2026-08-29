const { Op } = require("sequelize");
const { User, Plan, JobRun } = require("../models");
const { sendPlanExpiringSoonEmail } = require("./email.service");
const { toDateOnlyString, todayDateOnlyUtc } = require("./plan.service");
const { isPlanExpiryReminderEnabled } = require("../config/plan-expiry-reminders");

const PLAN_EXPIRY_REMINDER_JOB = JobRun.PLAN_EXPIRY_REMINDER_JOB;
/** Reminder offsets (days before plan_expires_at). */
const REMINDER_DAYS = [7, 5, 3, 1];

function addDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(
    utc.getUTCDate()
  ).padStart(2, "0")}`;
}

function reminderRunKey({ userId, expiresAt, daysLeft }) {
  return `${userId}:${expiresAt}:d${daysLeft}`.slice(0, 40);
}

async function alreadySentReminder(runKey) {
  const existing = await JobRun.findOne({
    where: { job_name: PLAN_EXPIRY_REMINDER_JOB, run_key: runKey }
  });
  return Boolean(existing);
}

async function markReminderSent(runKey) {
  await JobRun.create({
    job_name: PLAN_EXPIRY_REMINDER_JOB,
    run_key: runKey,
    ran_at: new Date()
  });
}

/**
 * Find active paid-plan hosts whose plan_expires_at is exactly N days from today,
 * and send one reminder email per (user, expiry date, day offset).
 */
async function sendPlanExpiryRemindersIfDue(_now = new Date()) {
  if (!isPlanExpiryReminderEnabled()) {
    return {
      today: todayDateOnlyUtc(),
      checked: 0,
      sent: 0,
      skipped: "disabled",
      errors: 0,
      byDays: {}
    };
  }

  const today = todayDateOnlyUtc();
  const summary = {
    today,
    checked: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    byDays: {}
  };

  for (const daysLeft of REMINDER_DAYS) {
    summary.byDays[daysLeft] = { candidates: 0, sent: 0, skipped: 0, errors: 0 };
    const targetExpiry = addDaysYmd(today, daysLeft);

    const users = await User.findAll({
      where: {
        is_active: true,
        plan_id: { [Op.ne]: null },
        plan_expires_at: targetExpiry,
        role: { [Op.in]: ["host"] }
      },
      attributes: ["user_id", "email", "full_name", "plan_id", "plan_expires_at"],
      include: [
        {
          model: Plan,
          as: "plan",
          required: true,
          where: { is_active: true, is_free: false },
          attributes: ["plan_id", "name", "is_free"]
        }
      ]
    });

    summary.byDays[daysLeft].candidates = users.length;
    summary.checked += users.length;

    for (const user of users) {
      const expiresAt = toDateOnlyString(user.plan_expires_at);
      const runKey = reminderRunKey({
        userId: user.user_id,
        expiresAt,
        daysLeft
      });

      try {
        if (await alreadySentReminder(runKey)) {
          summary.skipped += 1;
          summary.byDays[daysLeft].skipped += 1;
          continue;
        }

        if (!user.email) {
          summary.skipped += 1;
          summary.byDays[daysLeft].skipped += 1;
          continue;
        }

        await sendPlanExpiringSoonEmail({
          to: user.email,
          fullName: user.full_name,
          planName: user.plan?.name || "your plan",
          expiresAt,
          daysLeft
        });

        await markReminderSent(runKey);
        summary.sent += 1;
        summary.byDays[daysLeft].sent += 1;
      } catch (err) {
        summary.errors += 1;
        summary.byDays[daysLeft].errors += 1;
        console.warn(
          `[plan-expiry-reminder] Failed user=${user.user_id} days=${daysLeft}:`,
          err.message
        );
      }
    }
  }

  return summary;
}

module.exports = {
  REMINDER_DAYS,
  sendPlanExpiryRemindersIfDue,
  reminderRunKey
};
