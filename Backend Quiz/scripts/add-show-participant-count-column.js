/**
 * One-off: add sessions.show_participant_count if missing.
 * Usage: node scripts/add-show-participant-count-column.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

async function main() {
  try {
    if (await columnExists("sessions", "show_participant_count")) {
      console.log("sessions.show_participant_count already exists");
      return;
    }
    await sequelize.query(
      `ALTER TABLE sessions
       ADD COLUMN show_participant_count TINYINT(1) NOT NULL DEFAULT 0
       AFTER survey_results_enabled`
    );
    console.log("Added sessions.show_participant_count");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
