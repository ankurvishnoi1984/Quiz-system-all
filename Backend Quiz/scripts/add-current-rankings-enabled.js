/**
 * Apply current_rankings_enabled column on sessions.
 * Usage: node scripts/add-current-rankings-enabled.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261006230000-add-current-rankings-enabled");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (sessions.current_rankings_enabled) {
      console.log("current_rankings_enabled column already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("current_rankings_enabled migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
