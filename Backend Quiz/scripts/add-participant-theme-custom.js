/**
 * Apply participant_theme_custom column on sessions.
 * Usage: node scripts/add-participant-theme-custom.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261008120000-add-participant-theme-custom");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (sessions.participant_theme_custom) {
      console.log("participant_theme_custom column already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("participant_theme_custom migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
