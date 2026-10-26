/**
 * Apply timer_ending_sound_* columns on questions.
 * Usage: node scripts/add-question-timer-ending-sound.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20261005160000-add-question-timer-ending-sound");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const questions = await queryInterface.describeTable("questions");
    if (questions.timer_ending_sound_key) {
      console.log("timer_ending_sound columns already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("timer_ending_sound migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
