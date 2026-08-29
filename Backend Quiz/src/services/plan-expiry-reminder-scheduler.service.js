const cron = require("node-cron");
const { sendPlanExpiryRemindersIfDue } = require("./plan-expiry-reminder.service");
const { isPlanExpiryReminderEnabled } = require("../config/plan-expiry-reminders");

/** Default: every day at 09:15 Asia/Kolkata (after weekly summary slot). */
const DEFAULT_CRON = "15 9 * * *";
const DEFAULT_TZ = "Asia/Kolkata";

let scheduledTask = null;

async function runPlanExpiryReminderTick(label = "scheduled") {
  if (!isPlanExpiryReminderEnabled()) {
    console.log(`[plan-expiry-reminder] ${label}: skipped (PLAN_EXPIRY_REMINDER_ENABLED=false)`);
    return { skipped: "disabled" };
  }

  try {
    const result = await sendPlanExpiryRemindersIfDue();
    console.log(
      `[plan-expiry-reminder] ${label}: checked=${result.checked} sent=${result.sent} skipped=${result.skipped} errors=${result.errors}`
    );
    return result;
  } catch (err) {
    console.warn(`[plan-expiry-reminder] ${label} run failed:`, err.message);
    throw err;
  }
}

function startPlanExpiryReminderScheduler() {
  if (scheduledTask) return;

  if (!isPlanExpiryReminderEnabled()) {
    console.log(
      "[plan-expiry-reminder] Scheduler not started (PLAN_EXPIRY_REMINDER_ENABLED=false)"
    );
    return;
  }

  const expression = process.env.PLAN_EXPIRY_REMINDER_CRON || DEFAULT_CRON;
  const timezone = process.env.PLAN_EXPIRY_REMINDER_TZ || DEFAULT_TZ;

  if (!cron.validate(expression)) {
    console.warn(
      `[plan-expiry-reminder] Invalid PLAN_EXPIRY_REMINDER_CRON "${expression}"; scheduler not started`
    );
    return;
  }

  scheduledTask = cron.schedule(
    expression,
    () => {
      runPlanExpiryReminderTick("cron").catch(() => {});
    },
    { timezone }
  );

  console.log(
    `[plan-expiry-reminder] Scheduler started (cron "${expression}", tz ${timezone})`
  );
}

function stopPlanExpiryReminderScheduler() {
  if (!scheduledTask) return;
  scheduledTask.stop();
  scheduledTask = null;
}

module.exports = {
  startPlanExpiryReminderScheduler,
  stopPlanExpiryReminderScheduler,
  runPlanExpiryReminderTick
};
