/**
 * Apply join_allowlist columns on sessions.
 * Usage: node scripts/add-session-join-allowlist.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261006120000-add-session-join-allowlist");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (sessions.join_allowlist_enabled && sessions.join_allowlist) {
      console.log("join_allowlist columns already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("join_allowlist migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
