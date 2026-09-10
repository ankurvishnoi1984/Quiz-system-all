/**
 * Create sms_otps table for mobile verification during signup.
 * Usage: node scripts/add-sms-otps-table.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

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
  try {
    await sequelize.authenticate();

    if (!(await tableExists("sms_otps"))) {
      await sequelize.query(`
        CREATE TABLE sms_otps (
          id INT NOT NULL AUTO_INCREMENT,
          mobile VARCHAR(20) NOT NULL,
          purpose VARCHAR(40) NOT NULL,
          code_hash VARCHAR(128) NOT NULL,
          attempts INT NOT NULL DEFAULT 0,
          expires_at DATETIME NOT NULL,
          consumed_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY sms_otps_mobile_purpose_created_idx (mobile, purpose, created_at)
        )
      `);
      console.log("Created sms_otps");
    } else {
      console.log("sms_otps already exists");
    }

    if (!(await columnExists("users", "mobile_number"))) {
      await sequelize.query(`
        ALTER TABLE users
        ADD COLUMN mobile_number VARCHAR(20) NULL AFTER email
      `);
      await sequelize.query(`
        CREATE UNIQUE INDEX users_mobile_number_unique
        ON users (mobile_number)
      `).catch(() => {
        // MySQL unique allows multiple NULLs; ignore if index exists
      });
      console.log("Added users.mobile_number");
    } else {
      console.log("users.mobile_number already exists");
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
