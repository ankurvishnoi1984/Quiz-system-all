/**
 * One-off: add users.rights_overrides JSON column.
 * Usage: node scripts/add-user-rights-overrides.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

async function main() {
  if (!(await columnExists("users", "rights_overrides"))) {
    await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN rights_overrides JSON NULL
    `);
    console.log("Added users.rights_overrides");
  } else {
    console.log("users.rights_overrides already exists");
  }

  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await sequelize.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
