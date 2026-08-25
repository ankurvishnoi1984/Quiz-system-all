"use strict";

/** Recipients for operational emails. Edit rows here instead of changing backend code. */
const WEBSITE_SIGNUP_ADMINS = [
  "suraj.patil@netcastservice.com",
  "shailendra.kumar@netcastservice.com"
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notification_recipients", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      purpose: {
        type: Sequelize.STRING(80),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex("notification_recipients", ["purpose", "email"], {
      unique: true,
      name: "notification_recipients_purpose_email_unique"
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      "notification_recipients",
      WEBSITE_SIGNUP_ADMINS.map((email) => ({
        purpose: "website_signup",
        email,
        is_active: true,
        created_at: now,
        updated_at: now
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notification_recipients");
  }
};
