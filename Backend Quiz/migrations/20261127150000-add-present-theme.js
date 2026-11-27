"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");

    if (!table.present_theme_mode) {
      await queryInterface.addColumn("sessions", "present_theme_mode", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "mirror_participant",
        after: "present_mode_settings"
      });
    }

    if (!table.present_theme) {
      await queryInterface.addColumn("sessions", "present_theme", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "default",
        after: "present_theme_mode"
      });
    }

    if (!table.present_theme_custom) {
      await queryInterface.addColumn("sessions", "present_theme_custom", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        after: "present_theme"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.present_theme_custom) {
      await queryInterface.removeColumn("sessions", "present_theme_custom");
    }
    if (table.present_theme) {
      await queryInterface.removeColumn("sessions", "present_theme");
    }
    if (table.present_theme_mode) {
      await queryInterface.removeColumn("sessions", "present_theme_mode");
    }
  }
};
