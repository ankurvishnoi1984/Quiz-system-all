/**
 * Apply advanced_active_slot column on sessions.
 * Usage: node scripts/add-advanced-active-slot.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261006220000-add-advanced-active-slot");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (sessions.advanced_active_slot) {
      console.log("advanced_active_slot column already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("advanced_active_slot migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
