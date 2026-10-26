"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("questions");
    if (!table.timer_ending_sound_key) {
      await queryInterface.addColumn("questions", "timer_ending_sound_key", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "classic",
        after: "timer_sound_url",
      });
    }
    if (!table.timer_ending_sound_url) {
      await queryInterface.addColumn("questions", "timer_ending_sound_url", {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        after: "timer_ending_sound_key",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("questions");
    if (table.timer_ending_sound_url) {
      await queryInterface.removeColumn("questions", "timer_ending_sound_url");
    }
    if (table.timer_ending_sound_key) {
      await queryInterface.removeColumn("questions", "timer_ending_sound_key");
    }
  },
};
