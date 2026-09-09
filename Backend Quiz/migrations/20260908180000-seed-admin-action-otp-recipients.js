"use strict";

/** Recipients for super-admin action OTP (plan / extra seats / extra questions). */
const ADMIN_ACTION_OTP_RECIPIENTS = [
  "suraj.patil@netcastservice.com",
  "shailendra.kumar@netcastservice.com"
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const email of ADMIN_ACTION_OTP_RECIPIENTS) {
      await queryInterface.sequelize.query(
        `INSERT INTO notification_recipients (purpose, email, is_active, created_at, updated_at)
         VALUES ('admin_action_otp', ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE is_active = 1, updated_at = NOW()`,
        { replacements: [email] }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("notification_recipients", {
      purpose: "admin_action_otp"
    });
  }
};
