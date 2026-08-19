const { sequelize } = require("../src/config/database");

async function run() {
  await sequelize.authenticate();
  const [rows] = await sequelize.query(
    "SHOW COLUMNS FROM users LIKE 'hints_completed'"
  );

  if (!rows.length) {
    await sequelize.query(
      "ALTER TABLE users ADD COLUMN hints_completed TINYINT(1) NOT NULL DEFAULT 0"
    );
    console.log("added hints_completed");
  } else {
    console.log("hints_completed already exists");
  }

  await sequelize.close();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
