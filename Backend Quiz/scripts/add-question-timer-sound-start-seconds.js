/**
 * Apply timer_sound_start_seconds on questions.
 * Usage: node scripts/add-question-timer-sound-start-seconds.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261007120000-add-question-timer-sound-start-seconds");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const questions = await queryInterface.describeTable("questions");
    if (questions.timer_sound_start_seconds) {
      console.log("timer_sound_start_seconds already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("timer_sound_start_seconds migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
