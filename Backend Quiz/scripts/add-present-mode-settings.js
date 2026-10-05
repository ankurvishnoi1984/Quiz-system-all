/**
 * Apply present_mode_settings column on sessions.
 * Usage: node scripts/add-present-mode-settings.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261005140000-add-present-mode-settings");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (sessions.present_mode_settings) {
      console.log("present_mode_settings already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("present_mode_settings migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
