/**
 * Reset test bank data and add per-Host ownership.
 * Usage: node scripts/add-tenant-question-bank.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20260917130000-tenant-scope-question-bank");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const topics = await queryInterface.describeTable("question_bank_topics");
    const questions = await queryInterface.describeTable("question_bank_questions");
    if (topics.owner_id && questions.owner_id) {
      console.log("Tenant Question Bank migration already applied.");
      return;
    }
    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("Tenant Question Bank migration applied.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
