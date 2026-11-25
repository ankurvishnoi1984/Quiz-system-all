"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.tab_switch_block_after) {
      await queryInterface.addColumn("sessions", "tab_switch_block_after", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        after: "tab_switch_detection_enabled"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.tab_switch_block_after) {
      await queryInterface.removeColumn("sessions", "tab_switch_block_after");
    }
  }
};
