/**
 * Apply join_locked column on sessions.
 * Usage: node scripts/add-join-locked.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261009120000-add-join-locked");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (sessions.join_locked) {
      console.log("join_locked column already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("join_locked migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
