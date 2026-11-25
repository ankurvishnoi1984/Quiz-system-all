"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");

    if (!table.certificate_enabled) {
      await queryInterface.addColumn("sessions", "certificate_enabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "thanks_screen_image_url"
      });
    }
    if (!table.certificate_template_url) {
      await queryInterface.addColumn("sessions", "certificate_template_url", {
        type: Sequelize.TEXT,
        allowNull: true,
        after: "certificate_enabled"
      });
    }
    if (!table.certificate_custom_font_url) {
      await queryInterface.addColumn("sessions", "certificate_custom_font_url", {
        type: Sequelize.TEXT,
        allowNull: true,
        after: "certificate_template_url"
      });
    }
    if (!table.certificate_name_layout) {
      await queryInterface.addColumn("sessions", "certificate_name_layout", {
        type: Sequelize.JSON,
        allowNull: true,
        after: "certificate_custom_font_url"
      });
    }
    if (!table.certificate_download_enabled) {
      await queryInterface.addColumn("sessions", "certificate_download_enabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "certificate_name_layout"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    for (const col of [
      "certificate_download_enabled",
      "certificate_name_layout",
      "certificate_custom_font_url",
      "certificate_template_url",
      "certificate_enabled"
    ]) {
      if (table[col]) {
        await queryInterface.removeColumn("sessions", col);
      }
    }
  }
};
