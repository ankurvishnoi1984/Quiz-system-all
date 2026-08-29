/**
 * Create user_plan_history and backfill the current plan for existing users.
 * Usage: node scripts/add-user-plan-history-table.js
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

async function indexExists(table, indexName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    { replacements: [table, indexName] }
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

async function main() {
  try {
    await sequelize.authenticate();

    if (!(await tableExists("user_plan_history"))) {
      await sequelize.query(`
        CREATE TABLE user_plan_history (
          history_id INT NOT NULL AUTO_INCREMENT,
          user_id INT NOT NULL,
          plan_id INT NOT NULL,
          plan_name VARCHAR(120) NOT NULL,
          max_participants INT NULL,
          max_questions_per_session INT NULL,
          is_free TINYINT(1) NOT NULL DEFAULT 0,
          started_at DATETIME NOT NULL,
          ended_at DATETIME NULL,
          expires_at DATE NULL,
          source VARCHAR(40) NOT NULL DEFAULT 'admin_assign',
          payment_id INT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (history_id),
          CONSTRAINT user_plan_history_user_id_fk
            FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT user_plan_history_plan_id_fk
            FOREIGN KEY (plan_id) REFERENCES plans (plan_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
          CONSTRAINT user_plan_history_payment_id_fk
            FOREIGN KEY (payment_id) REFERENCES payments (payment_id)
            ON UPDATE CASCADE ON DELETE SET NULL
        )
      `);
      console.log("Created user_plan_history");
    } else {
      console.log("user_plan_history already exists");
    }

    if (!(await indexExists("user_plan_history", "user_plan_history_user_id_idx"))) {
      await sequelize.query(
        "ALTER TABLE user_plan_history ADD INDEX user_plan_history_user_id_idx (user_id)"
      );
      console.log("Added user_plan_history_user_id_idx");
    }

    if (!(await indexExists("user_plan_history", "user_plan_history_user_open_idx"))) {
      await sequelize.query(
        "ALTER TABLE user_plan_history ADD INDEX user_plan_history_user_open_idx (user_id, ended_at)"
      );
      console.log("Added user_plan_history_user_open_idx");
    }

    const questionsSelect = (await columnExists("plans", "max_questions_per_session"))
      ? "p.max_questions_per_session"
      : "NULL";

    const [result] = await sequelize.query(`
      INSERT INTO user_plan_history (
        user_id, plan_id, plan_name, max_participants, max_questions_per_session,
        is_free, started_at, ended_at, expires_at, source, payment_id
      )
      SELECT
        u.user_id,
        u.plan_id,
        p.name,
        p.max_participants,
        ${questionsSelect},
        p.is_free,
        COALESCE(
          (
            SELECT MIN(pay.paid_at)
            FROM payments pay
            WHERE pay.user_id = u.user_id
              AND pay.status = 'paid'
              AND pay.plan_id = u.plan_id
          ),
          u.created_at,
          NOW()
        ),
        NULL,
        u.plan_expires_at,
        'backfill',
        (
          SELECT pay.payment_id
          FROM payments pay
          WHERE pay.user_id = u.user_id
            AND pay.status = 'paid'
            AND pay.plan_id = u.plan_id
          ORDER BY pay.paid_at ASC, pay.payment_id ASC
          LIMIT 1
        )
      FROM users u
      INNER JOIN plans p ON p.plan_id = u.plan_id
      WHERE u.plan_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM user_plan_history h
          WHERE h.user_id = u.user_id
            AND h.ended_at IS NULL
        )
    `);
    const inserted = result?.affectedRows ?? result;
    console.log(`Backfilled current plans (${typeof inserted === "number" ? inserted : "done"})`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
