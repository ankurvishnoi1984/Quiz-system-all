/**
 * Apply Question Bank roles, tables, indexes, and session provenance column.
 * Usage: node scripts/add-question-bank-workflow.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const migration = require("../migrations/20260916120000-create-question-bank-workflow");

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const tables = (await queryInterface.showAllTables()).map((value) =>
      String(typeof value === "string" ? value : value.tableName || value.name || "")
        .toLowerCase()
    );

    if (tables.includes("question_bank_topics")) {
      console.log("Question Bank tables already exist; skipping table migration.");
      await sequelize.query(`
        INSERT INTO roles (slug, name, data_scope, permissions, is_system, is_active)
        VALUES
          ('author', 'Question Author', 'own_sessions', JSON_ARRAY(), 1, 1),
          ('auditor', 'Question Auditor', 'own_sessions', JSON_ARRAY(), 1, 1)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          permissions = VALUES(permissions),
          is_system = 1,
          is_active = 1
      `);
      return;
    }

    await migration.up(queryInterface, sequelize.Sequelize);
    console.log("Question Bank workflow migration applied.");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
