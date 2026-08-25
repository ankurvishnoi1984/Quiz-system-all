const cron = require("node-cron");
const { sendWeeklySummaryIfDue } = require("./weekly-summary.service");

const DEFAULT_CRON = "0 9 * * 1";
const DEFAULT_TZ = "Asia/Kolkata";

let scheduledTask = null;

async function runWeeklySummaryTick(label = "scheduled") {
  try {
    const result = await sendWeeklySummaryIfDue();
    if (result.sent) {
      console.log(
        `[weekly-summary] Sent ${label} report for week ending ${result.summary?.runKey}`
      );
    } else {
      console.log(`[weekly-summary] Skipped (${result.skipped || "not_due"})`);
    }
  } catch (err) {
    console.warn(`[weekly-summary] ${label} run failed:`, err.message);
  }
}

function startWeeklySummaryScheduler() {
  if (scheduledTask) return;

  const expression = process.env.WEEKLY_SUMMARY_CRON || DEFAULT_CRON;
  const timezone = process.env.WEEKLY_SUMMARY_TZ || DEFAULT_TZ;

  if (!cron.validate(expression)) {
    console.warn(
      `[weekly-summary] Invalid WEEKLY_SUMMARY_CRON "${expression}"; scheduler not started`
    );
    return;
  }

  scheduledTask = cron.schedule(
    expression,
    () => {
      runWeeklySummaryTick("cron").catch(() => {});
    },
    { timezone }
  );

  console.log(
    `[weekly-summary] Scheduler started (cron "${expression}", tz ${timezone})`
  );
}

function stopWeeklySummaryScheduler() {
  if (!scheduledTask) return;
  scheduledTask.stop();
  scheduledTask = null;
}

module.exports = {
  startWeeklySummaryScheduler,
  stopWeeklySummaryScheduler,
  runWeeklySummaryTick
};
