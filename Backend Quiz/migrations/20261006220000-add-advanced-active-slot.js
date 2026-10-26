"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.advanced_active_slot) {
      await queryInterface.addColumn("sessions", "advanced_active_slot", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        after: "response_time_score_bands",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.advanced_active_slot) {
      await queryInterface.removeColumn("sessions", "advanced_active_slot");
    }
  },
};
