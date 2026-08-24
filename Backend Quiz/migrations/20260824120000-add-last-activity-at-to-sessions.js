"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sessions", "last_activity_at", {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.sequelize.query(
      "UPDATE sessions SET last_activity_at = NOW() WHERE status IN ('live', 'paused') AND last_activity_at IS NULL"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("sessions", "last_activity_at");
  }
};
