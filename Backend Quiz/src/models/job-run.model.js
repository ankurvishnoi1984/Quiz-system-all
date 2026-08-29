const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const WEEKLY_SUMMARY_JOB = "weekly_summary";
const PLAN_EXPIRY_REMINDER_JOB = "plan_expiry_reminder";

const JobRun = sequelize.define(
  "job_runs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    job_name: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    run_key: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    ran_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    tableName: "job_runs",
    timestamps: false
  }
);

JobRun.WEEKLY_SUMMARY_JOB = WEEKLY_SUMMARY_JOB;
JobRun.PLAN_EXPIRY_REMINDER_JOB = PLAN_EXPIRY_REMINDER_JOB;

module.exports = JobRun;
