/**
 * Apply Advanced Question Builder schema.
 * Usage: node scripts/add-advanced-question-builder.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261005120000-add-advanced-question-builder");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (sessions.builder_mode) {
      console.log("Advanced Question Builder migration already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("Advanced Question Builder migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
