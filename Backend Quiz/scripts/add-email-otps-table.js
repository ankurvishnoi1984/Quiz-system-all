/**
 * Create email_otps table for payment / login OTP.
 * Usage: node scripts/add-email-otps-table.js
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

async function main() {
  try {
    await sequelize.authenticate();
    if (await tableExists("email_otps")) {
      console.log("email_otps already exists");
      return;
    }
    await sequelize.query(`
      CREATE TABLE email_otps (
        id INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        purpose VARCHAR(40) NOT NULL,
        code_hash VARCHAR(128) NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        consumed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY email_otps_email_purpose_created_idx (email, purpose, created_at)
      )
    `);
    console.log("Created email_otps");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
