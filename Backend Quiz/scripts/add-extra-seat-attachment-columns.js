const { sequelize } = require("../src/config/database");

async function columnExists(column) {
  const [rows] = await sequelize.query(
    "SHOW COLUMNS FROM user_participant_addons LIKE ?",
    { replacements: [column] }
  );
  return rows.length > 0;
}

async function run() {
  await sequelize.authenticate();

  await sequelize.query("ALTER TABLE user_participant_addons MODIFY note TEXT NULL");
  console.log("note column is TEXT");

  if (!(await columnExists("attachment_url"))) {
    await sequelize.query(
      "ALTER TABLE user_participant_addons ADD COLUMN attachment_url TEXT NULL"
    );
    console.log("added attachment_url");
  } else {
    console.log("attachment_url already exists");
  }

  if (!(await columnExists("attachment_filename"))) {
    await sequelize.query(
      "ALTER TABLE user_participant_addons ADD COLUMN attachment_filename VARCHAR(255) NULL"
    );
    console.log("added attachment_filename");
  } else {
    console.log("attachment_filename already exists");
  }

  await sequelize.close();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
