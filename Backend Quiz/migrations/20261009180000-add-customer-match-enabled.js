"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.customer_match_enabled) {
      await queryInterface.addColumn("sessions", "customer_match_enabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "join_allowlist",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.customer_match_enabled) {
      await queryInterface.removeColumn("sessions", "customer_match_enabled");
    }
  },
};
