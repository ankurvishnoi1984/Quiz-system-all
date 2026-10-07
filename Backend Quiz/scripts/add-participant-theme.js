/**
 * Apply participant_theme column on sessions.
 * Usage: node scripts/add-participant-theme.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261007120000-add-participant-theme");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (sessions.participant_theme) {
      console.log("participant_theme column already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("participant_theme migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
