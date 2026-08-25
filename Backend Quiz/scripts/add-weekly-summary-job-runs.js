/**
 * Create job_runs and seed weekly_summary notification recipients.
 * Usage: node scripts/add-weekly-summary-job-runs.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");

const ADMIN_EMAILS = [
  "suraj.patil@netcastservice.com",
  "shailendra.kumar@netcastservice.com"
];

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

async function main() {
  try {
    await sequelize.authenticate();

    if (!(await tableExists("job_runs"))) {
      await sequelize.query(`
        CREATE TABLE job_runs (
          id INT NOT NULL AUTO_INCREMENT,
          job_name VARCHAR(80) NOT NULL,
          run_key VARCHAR(40) NOT NULL,
          ran_at DATETIME NOT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY job_runs_job_name_run_key_unique (job_name, run_key)
        )
      `);
      console.log("Created job_runs");
    } else {
      console.log("job_runs already exists");
    }

    if (!(await tableExists("notification_recipients"))) {
      console.error(
        "notification_recipients is missing. Run scripts/add-notification-recipients-table.js first."
      );
      process.exitCode = 1;
      return;
    }

    for (const email of ADMIN_EMAILS) {
      await sequelize.query(
        `INSERT INTO notification_recipients (purpose, email, is_active)
         VALUES ('weekly_summary', ?, 1)
         ON DUPLICATE KEY UPDATE is_active = 1`,
        { replacements: [email] }
      );
      console.log(`Ensured weekly_summary recipient ${email}`);
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
