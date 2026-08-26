/**
 * Add plans.max_questions_per_session and seed paid-plan limits.
 * Usage: node scripts/add-max-questions-per-session-column.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");

const PLAN_QUESTION_LIMITS = {
  Starter: 15,
  Standard: 40,
  Professional: 100,
  Enterprise: 250
};
const DEFAULT_MAX_QUESTIONS = 15;

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
    await sequelize.authenticate();

    if (!(await columnExists("plans", "max_questions_per_session"))) {
      await sequelize.query(
        `ALTER TABLE plans
         ADD COLUMN max_questions_per_session INT NOT NULL DEFAULT ${DEFAULT_MAX_QUESTIONS}
         AFTER max_participants`
      );
      console.log("Added plans.max_questions_per_session");
    } else {
      console.log("plans.max_questions_per_session already exists");
    }

    for (const [name, limit] of Object.entries(PLAN_QUESTION_LIMITS)) {
      const [result] = await sequelize.query(
        `UPDATE plans SET max_questions_per_session = ? WHERE name = ?`,
        { replacements: [limit, name] }
      );
      console.log(`Set ${name} -> ${limit} (affected ${result?.affectedRows ?? "?"})`);
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
