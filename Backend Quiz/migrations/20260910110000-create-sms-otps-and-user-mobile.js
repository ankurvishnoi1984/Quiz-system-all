"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sms_otps", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      mobile: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      purpose: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      code_hash: {
        type: Sequelize.STRING(128),
        allowNull: false
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      consumed_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex("sms_otps", ["mobile", "purpose", "created_at"], {
      name: "sms_otps_mobile_purpose_created_idx"
    });

    const users = await queryInterface.describeTable("users");
    if (!users.mobile_number) {
      await queryInterface.addColumn("users", "mobile_number", {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true
      });
    }
  },

  async down(queryInterface) {
    const users = await queryInterface.describeTable("users");
    if (users.mobile_number) {
      await queryInterface.removeColumn("users", "mobile_number");
    }
    await queryInterface.dropTable("sms_otps");
  }
};
