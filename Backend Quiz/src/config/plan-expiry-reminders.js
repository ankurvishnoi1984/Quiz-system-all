/**
 * Plan expiry email reminder feature flag.
 *
 * Set in Backend Quiz `.env`:
 *   PLAN_EXPIRY_REMINDER_ENABLED=true|false
 *
 * Default: enabled. Set to false/0/off to skip the daily reminder cron and
 * manual send scripts without deleting code.
 *
 * Keep this in the backend env — reminder emails are sent by the API process,
 * not by the frontend.
 */
const { parseFlag } = require("./integrations");

function isPlanExpiryReminderEnabled() {
  return parseFlag(process.env.PLAN_EXPIRY_REMINDER_ENABLED, true);
}

module.exports = {
  isPlanExpiryReminderEnabled
};
