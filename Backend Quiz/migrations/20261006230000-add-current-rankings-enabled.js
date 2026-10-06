"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.current_rankings_enabled) {
      await queryInterface.addColumn("sessions", "current_rankings_enabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.current_rankings_enabled) {
      await queryInterface.removeColumn("sessions", "current_rankings_enabled");
    }
  }
};
