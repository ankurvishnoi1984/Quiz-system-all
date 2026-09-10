/**
 * One-off: expand sessions.join_type ENUM and add participants.mobile.
 * Usage: node scripts/add-join-mobile-and-participant-mobile.js
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

async function indexExists(name) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND INDEX_NAME = ?`,
    { replacements: [name] }
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

async function main() {
  await sequelize.query(`
    ALTER TABLE sessions
    MODIFY COLUMN join_type
    ENUM('name', 'anonymous', 'name_email', 'name_mobile', 'name_email_mobile')
    NOT NULL
    DEFAULT 'name'
  `);
  console.log("Updated sessions.join_type ENUM");

  if (!(await columnExists("participants", "mobile"))) {
    await sequelize.query(`
      ALTER TABLE participants
      ADD COLUMN mobile VARCHAR(20) NULL
    `);
    console.log("Added participants.mobile");
  } else {
    console.log("participants.mobile already exists");
  }

  if (!(await indexExists("participants_session_mobile_idx"))) {
    await sequelize.query(`
      CREATE INDEX participants_session_mobile_idx
      ON participants (session_id, mobile)
    `);
    console.log("Added participants_session_mobile_idx");
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
