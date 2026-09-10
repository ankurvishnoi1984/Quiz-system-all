const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
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
    urlTemplate: process.env.SMS_URL || "",
    // Message template: {0}=otp code. Prefer process.env.SMS_MSG.
    messageTemplate:
      process.env.SMS_MSG ||
      "{0} is your otp to verify your number for doctor engagement survey activity. Thank you - Highvoltage Softwares Pvt Ltd."
  }
};

module.exports = env;
