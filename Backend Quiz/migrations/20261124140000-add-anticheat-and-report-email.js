"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");

    if (!table.tab_switch_detection_enabled) {
      await queryInterface.addColumn("sessions", "tab_switch_detection_enabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "join_locked"
      });
    }
    if (!table.single_device_join_enabled) {
      await queryInterface.addColumn("sessions", "single_device_join_enabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "tab_switch_detection_enabled"
      });
    }
    if (!table.auto_email_report_on_end) {
      await queryInterface.addColumn("sessions", "auto_email_report_on_end", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        after: "single_device_join_enabled"
      });
    }
    if (!table.report_email_sent_at) {
      await queryInterface.addColumn("sessions", "report_email_sent_at", {
        type: Sequelize.DATE,
        allowNull: true,
        after: "auto_email_report_on_end"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.report_email_sent_at) {
      await queryInterface.removeColumn("sessions", "report_email_sent_at");
    }
    if (table.auto_email_report_on_end) {
      await queryInterface.removeColumn("sessions", "auto_email_report_on_end");
    }
    if (table.single_device_join_enabled) {
      await queryInterface.removeColumn("sessions", "single_device_join_enabled");
    }
    if (table.tab_switch_detection_enabled) {
      await queryInterface.removeColumn("sessions", "tab_switch_detection_enabled");
    }
  }
};
