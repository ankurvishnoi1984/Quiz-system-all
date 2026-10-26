"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("questions");
    if (!table.timer_sound_start_seconds) {
      await queryInterface.addColumn("questions", "timer_sound_start_seconds", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        after: "timer_ending_sound_url",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("questions");
    if (table.timer_sound_start_seconds) {
      await queryInterface.removeColumn("questions", "timer_sound_start_seconds");
    }
  },
};
