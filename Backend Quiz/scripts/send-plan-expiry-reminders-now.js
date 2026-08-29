/**
 * Send plan-expiry reminder emails for hosts whose plan ends in 7/5/3/1 days.
 * Usage: node scripts/send-plan-expiry-reminders-now.js
 *        node scripts/send-plan-expiry-reminders-now.js --force  (re-send even if already logged)
 *
 * Note: --force still uses the same job_runs keys unless you delete those rows first.
 * For a true re-send, delete matching job_runs for plan_expiry_reminder.
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const { sendPlanExpiryRemindersIfDue } = require("../src/services/plan-expiry-reminder.service");

async function main() {
  try {
    await sequelize.authenticate();
    const result = await sendPlanExpiryRemindersIfDue();
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
