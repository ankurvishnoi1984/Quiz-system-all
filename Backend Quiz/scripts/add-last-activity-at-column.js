const { sequelize } = require("../src/config/database");

async function run() {
  await sequelize.authenticate();
  const [rows] = await sequelize.query(
    "SHOW COLUMNS FROM sessions LIKE 'last_activity_at'"
  );

  if (!rows.length) {
    await sequelize.query(
      "ALTER TABLE sessions ADD COLUMN last_activity_at DATETIME NULL"
    );
    await sequelize.query(
      "UPDATE sessions SET last_activity_at = NOW() WHERE status IN ('live', 'paused') AND last_activity_at IS NULL"
    );
    console.log("added last_activity_at");
  } else {
    console.log("last_activity_at already exists");
  }

  await sequelize.close();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
