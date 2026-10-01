"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.join_otp_required) {
      await queryInterface.addColumn("sessions", "join_otp_required", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn("sessions", "join_otp_required");
    } catch (_error) {
      // ignore
    }
  }
};
