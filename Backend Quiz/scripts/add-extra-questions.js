/**
 * Add users.extra_questions and user_question_addons.
 * Usage: node scripts/add-extra-questions.js
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

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
  try {
    await sequelize.authenticate();

    if (!(await columnExists("users", "extra_questions"))) {
      await sequelize.query(`
        ALTER TABLE users
        ADD COLUMN extra_questions INT NOT NULL DEFAULT 0
        AFTER extra_participants
      `);
      console.log("Added users.extra_questions");
    } else {
      console.log("users.extra_questions already exists");
    }

    if (!(await tableExists("user_question_addons"))) {
      await sequelize.query(`
        CREATE TABLE user_question_addons (
          addon_id INT NOT NULL AUTO_INCREMENT,
          user_id INT NOT NULL,
          questions INT NOT NULL,
          note TEXT NULL,
          attachment_url TEXT NULL,
          attachment_filename VARCHAR(255) NULL,
          created_by INT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (addon_id),
          KEY user_question_addons_user_id (user_id),
          CONSTRAINT user_question_addons_user_id_fk
            FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE CASCADE
        )
      `);
      console.log("Created user_question_addons");
    } else {
      console.log("user_question_addons already exists");
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
