"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("blocked_ips");

    if (!table.is_active) {
      await queryInterface.addColumn("blocked_ips", "is_active", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
    if (!table.unblock_reason) {
      await queryInterface.addColumn("blocked_ips", "unblock_reason", {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }
    if (!table.unblocked_by) {
      await queryInterface.addColumn("blocked_ips", "unblocked_by", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
    if (!table.unblocked_at) {
      await queryInterface.addColumn("blocked_ips", "unblocked_at", {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    await queryInterface.sequelize.query(
      `UPDATE blocked_ips SET reason = 'Blocked from connection monitor' WHERE reason IS NULL OR reason = ''`
    );
    await queryInterface.changeColumn("blocked_ips", "reason", {
      type: Sequelize.STRING(255),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("blocked_ips");
    if (table.unblocked_at) await queryInterface.removeColumn("blocked_ips", "unblocked_at");
    if (table.unblocked_by) await queryInterface.removeColumn("blocked_ips", "unblocked_by");
    if (table.unblock_reason) await queryInterface.removeColumn("blocked_ips", "unblock_reason");
    if (table.is_active) await queryInterface.removeColumn("blocked_ips", "is_active");
    await queryInterface.changeColumn("blocked_ips", "reason", {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  }
};
