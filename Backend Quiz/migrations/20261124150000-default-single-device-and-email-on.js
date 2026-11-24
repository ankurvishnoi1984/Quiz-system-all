"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");

    if (table.single_device_join_enabled) {
      await queryInterface.changeColumn("sessions", "single_device_join_enabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
      await queryInterface.sequelize.query(
        "UPDATE `sessions` SET `single_device_join_enabled` = 1 WHERE `single_device_join_enabled` = 0"
      );
    }

    if (table.auto_email_report_on_end) {
      await queryInterface.changeColumn("sessions", "auto_email_report_on_end", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
      await queryInterface.sequelize.query(
        "UPDATE `sessions` SET `auto_email_report_on_end` = 1 WHERE `auto_email_report_on_end` = 0"
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (table.single_device_join_enabled) {
      await queryInterface.changeColumn("sessions", "single_device_join_enabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (table.auto_email_report_on_end) {
      await queryInterface.changeColumn("sessions", "auto_email_report_on_end", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
  }
};
