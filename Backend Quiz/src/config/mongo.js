const { MongoClient } = require("mongodb");
const env = require("./env");
const {
  startMongoSshTunnel,
  stopMongoSshTunnel
} = require("./mongo-ssh-tunnel");

let client = null;
let db = null;
let connecting = null;

async function ensureIndexes(database) {
  const retentionDays = Number(env.mongo.retentionDays) || 90;
  const collection = database.collection("error_logs");
  await collection.createIndexes([
    {
      key: { created_at: 1 },
      name: "ttl_created_at",
      expireAfterSeconds: retentionDays * 24 * 60 * 60
    },
    { key: { level: 1, created_at: -1 }, name: "level_created_at" },
    { key: { source: 1, created_at: -1 }, name: "source_created_at" },
    { key: { status_code: 1 }, name: "status_code" }
  ]);
}

/**
 * Optional SSH tunnel, then one shared MongoClient.
 * Non-fatal: API keeps running if Mongo or the tunnel is unavailable.
 */
async function connectMongo() {
  if (!env.mongo.logEnabled) {
    console.warn("[mongo] MONGO_LOG_ENABLED is off — error logs will use console only");
    return null;
  }

  if (db) {
    return db;
  }
  if (connecting) {
    return connecting;
  }

  connecting = (async () => {
    try {
      await startMongoSshTunnel();

      const uri = env.mongo.uri;
      if (!uri) {
        console.warn("[mongo] MONGO_URI missing — error logs will use console only");
        return null;
      }

      const mongoClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });

      await mongoClient.connect();

      // Ping the app DB (from MONGO_URI path). Avoid admin().ping() —
      // quiz_logs_app only has readWrite on quiz_logs, not admin.
      const database = mongoClient.db();
      await database.command({ ping: 1 });
      await ensureIndexes(database);

      client = mongoClient;
      db = database;
      console.log(
        `[mongo] connected for error logs (db=${database.databaseName})`
      );
      return db;
    } catch (error) {
      const hint =
        error.code === 18 || /authentication failed/i.test(error.message || "")
          ? " — check MONGO_URI user/password and authSource=quiz_logs (SSH tunnel is separate from Mongo login)"
          : "";
      console.warn(
        `[mongo] connect failed (continuing without Mongo): ${error.message}${hint}`
      );
      client = null;
      db = null;
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

function getMongoDb() {
  return db;
}

function isMongoReady() {
  return Boolean(db && client);
}

async function closeMongo() {
  const current = client;
  client = null;
  db = null;
  connecting = null;
  if (current) {
    try {
      await current.close();
    } catch (_) {
      /* ignore */
    }
  }
  await stopMongoSshTunnel();
}

module.exports = {
  connectMongo,
  closeMongo,
  getMongoDb,
  isMongoReady
};
