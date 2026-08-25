/**
 * Create notification_recipients and seed website-signup admin emails.
 * Usage: node scripts/add-notification-recipients-table.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");

const ADMIN_EMAILS = [
  "suraj.patil@netcastservice.com",
  "shailendra.kumar@netcastservice.com"
];

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

    if (!(await tableExists("notification_recipients"))) {
      await sequelize.query(`
        CREATE TABLE notification_recipients (
          id INT NOT NULL AUTO_INCREMENT,
          purpose VARCHAR(80) NOT NULL,
          email VARCHAR(255) NOT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY notification_recipients_purpose_email_unique (purpose, email)
        )
      `);
      console.log("Created notification_recipients");
    } else {
      console.log("notification_recipients already exists");
    }

    for (const email of ADMIN_EMAILS) {
      await sequelize.query(
        `INSERT INTO notification_recipients (purpose, email, is_active)
         VALUES ('website_signup', ?, 1)
         ON DUPLICATE KEY UPDATE is_active = 1`,
        { replacements: [email] }
      );
      console.log(`Ensured recipient ${email}`);
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
