"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("questions", "timer_sound_key", {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: "classic",
      after: "time_limit_seconds",
    });
    await queryInterface.addColumn("questions", "timer_sound_url", {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      after: "timer_sound_key",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("questions", "timer_sound_url");
    await queryInterface.removeColumn("questions", "timer_sound_key");
  },
};
