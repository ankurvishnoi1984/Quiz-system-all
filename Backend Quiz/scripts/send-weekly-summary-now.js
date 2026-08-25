/**
 * Send the weekly summary email immediately (for testing).
 * Usage:
 *   node scripts/send-weekly-summary-now.js
 *   node scripts/send-weekly-summary-now.js --force
 *
 * --force sends even if this week was already recorded in job_runs.
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const { sendWeeklySummaryIfDue } = require("../src/services/weekly-summary.service");

async function main() {
  const force = process.argv.includes("--force");
  try {
    await sequelize.authenticate();
    const result = await sendWeeklySummaryIfDue({ force });
    if (result.sent) {
      console.log("Weekly summary email sent.");
      console.log(
        JSON.stringify(
          {
            runKey: result.summary.runKey,
            weekStartLabel: result.summary.weekStartLabel,
            weekEndLabel: result.summary.weekEndLabel,
            purchasesCount: result.summary.purchasesCount,
            revenueLabel: result.summary.revenueLabel,
            totalPaidUsers: result.summary.totalPaidUsers,
            netPaidChange: result.summary.netPaidChange
          },
          null,
          2
        )
      );
    } else {
      console.log(`Skipped: ${result.skipped}`);
      console.log("Pass --force to send anyway.");
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
