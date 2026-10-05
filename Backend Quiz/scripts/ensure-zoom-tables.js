/**
 * Creates Zoom integration tables if they do not exist.
 * Usage: node scripts/ensure-zoom-tables.js
 */
require("dotenv").config();
const { connectDatabase, sequelize } = require("../src/config/database");
require("../src/models");

async function main() {
  await connectDatabase();
  const { ZoomConnection, ZoomMeetingSession, ZoomParticipantMap } = require("../src/models");
  await ZoomConnection.sync();
  await ZoomMeetingSession.sync();
  await ZoomParticipantMap.sync();
  console.log("Zoom tables are ready.");
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
