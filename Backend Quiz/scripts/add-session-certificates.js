/**
 * Apply session certificate columns.
 * Usage: node scripts/add-session-certificates.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261125160000-add-session-certificates");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const sessions = await queryInterface.describeTable("sessions");
    if (
      sessions.certificate_enabled &&
      sessions.certificate_template_url &&
      sessions.certificate_custom_font_url &&
      sessions.certificate_name_layout &&
      sessions.certificate_download_enabled
    ) {
      console.log("Session certificate columns already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("Session certificate migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
