"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");

    if (!table.session_logo_placement) {
      await queryInterface.addColumn("sessions", "session_logo_placement", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "both",
        after: "logo_url"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.session_logo_placement) {
      await queryInterface.removeColumn("sessions", "session_logo_placement");
    }
  }
};
