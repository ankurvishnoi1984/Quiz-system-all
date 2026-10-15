/**
 * Apply quiz_total_time_synced column on sessions.
 * Usage: node scripts/add-quiz-total-time-synced.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261014220000-add-quiz-total-time-synced");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (sessions.quiz_total_time_synced) {
      console.log("quiz_total_time_synced column already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("quiz_total_time_synced migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
