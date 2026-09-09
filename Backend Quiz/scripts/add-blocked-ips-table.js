/**
 * Create blocked_ips table for Connection Monitor IP blocking.
 * Usage: node scripts/add-blocked-ips-table.js
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
    if (await tableExists("blocked_ips")) {
      console.log("blocked_ips already exists");
      return;
    }
    await sequelize.query(`
      CREATE TABLE blocked_ips (
        blocked_ip_id INT NOT NULL AUTO_INCREMENT,
        ip_address VARCHAR(64) NOT NULL,
        reason VARCHAR(255) NULL,
        blocked_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (blocked_ip_id),
        UNIQUE KEY blocked_ips_ip_address_unique (ip_address),
        CONSTRAINT blocked_ips_blocked_by_fk
          FOREIGN KEY (blocked_by) REFERENCES users(user_id)
          ON UPDATE CASCADE ON DELETE SET NULL
      )
    `);
    console.log("Created blocked_ips");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
