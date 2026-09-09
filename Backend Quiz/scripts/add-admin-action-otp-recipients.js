/**
 * Seed admin_action_otp recipients for super-admin plan / seats / questions OTP.
 * Usage: node scripts/add-admin-action-otp-recipients.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");

const ADMIN_EMAILS = [
  "suraj.patil@netcastservice.com",
  "shailendra.kumar@netcastservice.com"
];

async function main() {
  try {
    await sequelize.authenticate();
    for (const email of ADMIN_EMAILS) {
      await sequelize.query(
        `INSERT INTO notification_recipients (purpose, email, is_active)
         VALUES ('admin_action_otp', ?, 1)
         ON DUPLICATE KEY UPDATE is_active = 1`,
        { replacements: [email] }
      );
      console.log(`Ensured admin_action_otp recipient ${email}`);
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
