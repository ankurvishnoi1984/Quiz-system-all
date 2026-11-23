const dotenv = require("dotenv");

dotenv.config();

function envFlagTrue(raw, defaultValue = false) {
  if (raw == null || String(raw).trim() === "") return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  // RATE_LIMIT_ENABLED: unset/true = enforce IP + OTP resend limits; false = load-test mode
  rateLimitEnabled: (() => {
    const raw = process.env.RATE_LIMIT_ENABLED;
    if (raw == null || String(raw).trim() === "") return true;
    const normalized = String(raw).trim().toLowerCase();
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return true;
  })(),
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || "quiz_db",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    pool: {
      // 20 parallel joins + Present refetches need more than Sequelize's default of 5
      max: Number(process.env.DB_POOL_MAX || 30),
      min: Number(process.env.DB_POOL_MIN || 5),
      acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
      idle: Number(process.env.DB_POOL_IDLE || 10000)
    }
  },
  jwtSecret: process.env.JWT_ACCESS_SECRET || "change_this_access_secret",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "change_this_access_secret",
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || "1h",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "change_this_refresh_secret",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d"
  },
  sms: {
    // Flash49-style GET template: {0}=to, {1}=message. Prefer process.env.SMS_URL.
    urlTemplate:
      process.env.SMS_URL ||
      "https://api.flash49.com/fe/api/v1/send?username=hsplotp.trans&password=Jkrnk&unicode=false&from=HVSOPL&to={0}&text={1}&dltContentId=1107172983543962142",
    // Message template: {0}=otp code. Prefer SMS_MSG_TEMPLATE / SMS_MSG.
    messageTemplate:
      process.env.SMS_MSG_TEMPLATE ||
      process.env.SMS_MSG ||
      "{0} is your otp to verify your number for doctor engagement survey activity. Thank you - Highvoltage Softwares Pvt Ltd."
  },
  mongo: {
    logEnabled: envFlagTrue(process.env.MONGO_LOG_ENABLED, false),
    uri: (process.env.MONGO_URI || "").trim(),
    retentionDays: Number(process.env.MONGO_LOG_RETENTION_DAYS || 90),
    ssh: {
      enabled: envFlagTrue(process.env.MONGO_SSH_TUNNEL_ENABLED, false),
      host: (process.env.MONGO_SSH_HOST || "").trim(),
      port: Number(process.env.MONGO_SSH_PORT || 2222),
      user: (process.env.MONGO_SSH_USER || "").trim(),
      privateKeyPath: (process.env.MONGO_SSH_PRIVATE_KEY_PATH || "").trim(),
      password: process.env.MONGO_SSH_PASSWORD || "",
      localHost: (process.env.MONGO_SSH_LOCAL_HOST || "127.0.0.1").trim(),
      localPort: Number(process.env.MONGO_SSH_LOCAL_PORT || 27017),
      remoteHost: (process.env.MONGO_SSH_REMOTE_HOST || "127.0.0.1").trim(),
      remotePort: Number(process.env.MONGO_SSH_REMOTE_PORT || 27017)
    }
  },
  // JSONL files for Alloy → Loki. Default: <process.cwd()>/logs
  appLog: {
    dir: (process.env.APP_LOG_DIR || "").trim(),
    retentionDays: Number(process.env.APP_LOG_FILE_RETENTION_DAYS || 7)
  }
};

module.exports = env;
