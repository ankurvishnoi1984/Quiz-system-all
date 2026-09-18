"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      String(typeof t === "string" ? t : t.tableName || t.name || "").toLowerCase()
    );

    if (tableNames.includes("roles")) {
      await queryInterface.sequelize.query(`
        INSERT INTO roles (slug, name, data_scope, permissions, is_system, is_active)
        VALUES
          ('sub_admin', 'Sub admin', 'platform', CAST('[]' AS JSON), 1, 1)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          data_scope = VALUES(data_scope),
          is_system = 1,
          is_active = 1
      `);
    }

    if (!tableNames.includes("users")) return;

    const users = await queryInterface.describeTable("users");

    if (!users.sub_admin_access) {
      await queryInterface.addColumn("users", "sub_admin_access", {
        type: Sequelize.ENUM("all", "clients", "departments"),
        allowNull: true,
        defaultValue: null
      });
    }

    if (!users.allowed_client_ids) {
      await queryInterface.addColumn("users", "allowed_client_ids", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null
      });
    }

    if (!users.allowed_dept_ids) {
      await queryInterface.addColumn("users", "allowed_dept_ids", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null
      });
    }

    if (!users.rights_overrides) {
      await queryInterface.addColumn("users", "rights_overrides", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      String(typeof t === "string" ? t : t.tableName || t.name || "").toLowerCase()
    );

    if (tableNames.includes("users")) {
      const users = await queryInterface.describeTable("users");
      if (users.allowed_dept_ids) {
        await queryInterface.removeColumn("users", "allowed_dept_ids");
      }
      if (users.allowed_client_ids) {
        await queryInterface.removeColumn("users", "allowed_client_ids");
      }
      if (users.sub_admin_access) {
        await queryInterface.removeColumn("users", "sub_admin_access");
        try {
          await queryInterface.sequelize.query(
            "DROP TYPE IF EXISTS enum_users_sub_admin_access;"
          );
        } catch {
          // MySQL ignores unused ENUM cleanup
        }
      }
    }

    if (tableNames.includes("roles")) {
      await queryInterface.sequelize.query(`
        DELETE FROM roles WHERE slug = 'sub_admin'
      `);
    }
  }
};
