"use strict";

const ALL_PERMISSIONS = JSON.stringify(["sessions", "builder", "present", "reports"]);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      String(typeof t === "string" ? t : t.tableName || t.name || "").toLowerCase()
    );
    if (!tableNames.includes("roles")) {
      await queryInterface.createTable("roles", {
        role_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        slug: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true
        },
        name: {
          type: Sequelize.STRING(80),
          allowNull: false
        },
        data_scope: {
          type: Sequelize.ENUM("platform", "client", "department", "own_sessions"),
          allowNull: false
        },
        permissions: {
          type: Sequelize.JSON,
          allowNull: false
        },
        is_system: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
        }
      });
    }

    await queryInterface.sequelize.query(`
      INSERT INTO roles (slug, name, data_scope, permissions, is_system, is_active)
      VALUES
        ('super_admin', 'Super admin', 'platform', CAST('${ALL_PERMISSIONS}' AS JSON), 1, 1),
        ('client_admin', 'Client admin', 'client', CAST('${ALL_PERMISSIONS}' AS JSON), 1, 1),
        ('dept_admin', 'Department admin', 'department', CAST('${ALL_PERMISSIONS}' AS JSON), 1, 1),
        ('host', 'Host', 'own_sessions', CAST('${ALL_PERMISSIONS}' AS JSON), 1, 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        data_scope = VALUES(data_scope),
        is_system = 1
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN role VARCHAR(64) NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN role
      ENUM('super_admin', 'client_admin', 'dept_admin', 'host')
      NOT NULL
    `);
    await queryInterface.dropTable("roles");
  }
};
