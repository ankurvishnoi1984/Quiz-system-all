"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");
    if (!table.join_allowlist_enabled) {
      await queryInterface.addColumn("sessions", "join_allowlist_enabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "join_otp_required",
      });
    }
    if (!table.join_allowlist) {
      await queryInterface.addColumn("sessions", "join_allowlist", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        after: "join_allowlist_enabled",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.join_allowlist) {
      await queryInterface.removeColumn("sessions", "join_allowlist");
    }
    if (table.join_allowlist_enabled) {
      await queryInterface.removeColumn("sessions", "join_allowlist_enabled");
    }
  },
};
