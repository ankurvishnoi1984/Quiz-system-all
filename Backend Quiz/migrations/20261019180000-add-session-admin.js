"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      INSERT INTO roles (slug, name, data_scope, permissions, is_system, is_active)
      VALUES
        (
          'session_admin',
          'Session Admin',
          'own_sessions',
          CAST('["reports"]' AS JSON),
          1,
          1
        )
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        data_scope = VALUES(data_scope),
        permissions = VALUES(permissions),
        is_system = 1,
        is_active = 1
    `);

    const table = await queryInterface.describeTable("sessions");
    if (!table.session_admin_user_id) {
      await queryInterface.addColumn("sessions", "session_admin_user_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
    }
    if (!table.session_admin_password_is_default) {
      await queryInterface.addColumn("sessions", "session_admin_password_is_default", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("sessions");
    if (table.session_admin_password_is_default) {
      await queryInterface.removeColumn("sessions", "session_admin_password_is_default");
    }
    if (table.session_admin_user_id) {
      await queryInterface.removeColumn("sessions", "session_admin_user_id");
    }
    await queryInterface.sequelize.query(`
      DELETE FROM roles WHERE slug = 'session_admin'
    `);
  }
};
