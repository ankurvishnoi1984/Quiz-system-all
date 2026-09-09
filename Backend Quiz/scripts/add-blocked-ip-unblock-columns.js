/**
 * Add soft-unblock columns to blocked_ips and require block reason.
 * Usage: node scripts/add-blocked-ip-unblock-columns.js
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
  try {
    await sequelize.authenticate();

    if (!(await columnExists("blocked_ips", "is_active"))) {
      await sequelize.query(
        `ALTER TABLE blocked_ips
         ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER blocked_by`
      );
      console.log("Added is_active");
    } else {
      console.log("is_active already exists");
    }

    if (!(await columnExists("blocked_ips", "unblock_reason"))) {
      await sequelize.query(
        `ALTER TABLE blocked_ips
         ADD COLUMN unblock_reason VARCHAR(255) NULL AFTER is_active`
      );
      console.log("Added unblock_reason");
    } else {
      console.log("unblock_reason already exists");
    }

    if (!(await columnExists("blocked_ips", "unblocked_by"))) {
      await sequelize.query(
        `ALTER TABLE blocked_ips
         ADD COLUMN unblocked_by INT NULL AFTER unblock_reason`
      );
      console.log("Added unblocked_by");
    } else {
      console.log("unblocked_by already exists");
    }

    if (!(await columnExists("blocked_ips", "unblocked_at"))) {
      await sequelize.query(
        `ALTER TABLE blocked_ips
         ADD COLUMN unblocked_at DATETIME NULL AFTER unblocked_by`
      );
      console.log("Added unblocked_at");
    } else {
      console.log("unblocked_at already exists");
    }

    await sequelize.query(
      `UPDATE blocked_ips SET reason = 'Blocked from connection monitor' WHERE reason IS NULL OR reason = ''`
    );
    await sequelize.query(
      `ALTER TABLE blocked_ips MODIFY COLUMN reason VARCHAR(255) NOT NULL`
    );
    console.log("reason is now required");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
