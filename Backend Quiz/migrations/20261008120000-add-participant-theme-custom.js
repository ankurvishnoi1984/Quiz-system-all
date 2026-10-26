"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.participant_theme_custom) {
      await queryInterface.addColumn("sessions", "participant_theme_custom", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        after: "participant_theme"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.participant_theme_custom) {
      await queryInterface.removeColumn("sessions", "participant_theme_custom");
    }
  }
};
