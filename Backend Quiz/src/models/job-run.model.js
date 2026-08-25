const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const WEEKLY_SUMMARY_JOB = "weekly_summary";

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

module.exports = JobRun;
