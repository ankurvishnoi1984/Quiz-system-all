"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.join_locked) {
      await queryInterface.addColumn("sessions", "join_locked", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "allow_late_join"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.join_locked) {
      await queryInterface.removeColumn("sessions", "join_locked");
    }
  }
};
