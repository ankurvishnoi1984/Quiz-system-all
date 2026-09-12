/**
 * One-off: create roles table, seed system roles, convert users.role to VARCHAR.
 * Usage: node scripts/add-roles-table.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");

const ALL_PERMISSIONS = JSON.stringify(["sessions", "builder", "present", "reports"]);

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

async function main() {
  if (!(await tableExists("roles"))) {
    await sequelize.query(`
      CREATE TABLE roles (
        role_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(80) NOT NULL,
        data_scope ENUM('platform', 'client', 'department', 'own_sessions') NOT NULL,
        permissions JSON NOT NULL,
        is_system TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Created roles table");
  } else {
    console.log("roles table already exists");
  }

  await sequelize.query(
    `
    INSERT INTO roles (slug, name, data_scope, permissions, is_system, is_active)
    VALUES
      ('super_admin', 'Super admin', 'platform', CAST(? AS JSON), 1, 1),
      ('client_admin', 'Client admin', 'client', CAST(? AS JSON), 1, 1),
      ('dept_admin', 'Department admin', 'department', CAST(? AS JSON), 1, 1),
      ('host', 'Host', 'own_sessions', CAST(? AS JSON), 1, 1)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      data_scope = VALUES(data_scope),
      is_system = 1
  `,
    { replacements: [ALL_PERMISSIONS, ALL_PERMISSIONS, ALL_PERMISSIONS, ALL_PERMISSIONS] }
  );
  console.log("Seeded system roles");

  await sequelize.query(`
    ALTER TABLE users
    MODIFY COLUMN role VARCHAR(64) NOT NULL
  `);
  console.log("Updated users.role to VARCHAR(64)");

  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await sequelize.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
