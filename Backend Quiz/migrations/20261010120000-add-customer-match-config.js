"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.customer_match_wc_code) {
      await queryInterface.addColumn("sessions", "customer_match_wc_code", {
        type: Sequelize.STRING(32),
        allowNull: true,
        defaultValue: null,
        after: "customer_match_enabled",
      });
    }
    if (!table.customer_match_zone) {
      await queryInterface.addColumn("sessions", "customer_match_zone", {
        type: Sequelize.STRING(16),
        allowNull: true,
        defaultValue: null,
        after: "customer_match_wc_code",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.customer_match_zone) {
      await queryInterface.removeColumn("sessions", "customer_match_zone");
    }
    if (table.customer_match_wc_code) {
      await queryInterface.removeColumn("sessions", "customer_match_wc_code");
    }
  },
};
