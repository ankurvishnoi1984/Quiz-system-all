"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.participant_theme) {
      await queryInterface.addColumn("sessions", "participant_theme", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "default"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.participant_theme) {
      await queryInterface.removeColumn("sessions", "participant_theme");
    }
  }
};
