"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.leaderboard_top_n) {
      await queryInterface.addColumn("sessions", "leaderboard_top_n", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.leaderboard_top_n) {
      await queryInterface.removeColumn("sessions", "leaderboard_top_n");
    }
  }
};
