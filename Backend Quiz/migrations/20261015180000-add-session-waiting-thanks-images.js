"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");

    if (!table.waiting_screen_image_url) {
      await queryInterface.addColumn("sessions", "waiting_screen_image_url", {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        after: "logo_url",
      });
    }

    if (!table.thanks_screen_image_url) {
      await queryInterface.addColumn("sessions", "thanks_screen_image_url", {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        after: "waiting_screen_image_url",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.thanks_screen_image_url) {
      await queryInterface.removeColumn("sessions", "thanks_screen_image_url");
    }
    if (table.waiting_screen_image_url) {
      await queryInterface.removeColumn("sessions", "waiting_screen_image_url");
    }
  },
};
