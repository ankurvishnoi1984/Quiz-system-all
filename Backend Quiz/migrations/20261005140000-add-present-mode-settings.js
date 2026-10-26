"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sessions", "present_mode_settings", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      after: "logo_url",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("sessions", "present_mode_settings");
  },
};
