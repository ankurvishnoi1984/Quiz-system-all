"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");

    if (!table.waiting_screen_media_type) {
      await queryInterface.addColumn("sessions", "waiting_screen_media_type", {
        type: Sequelize.STRING(32),
        allowNull: true,
        defaultValue: null,
        after: "waiting_screen_image_url",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.waiting_screen_media_type) {
      await queryInterface.removeColumn("sessions", "waiting_screen_media_type");
    }
  },
};
