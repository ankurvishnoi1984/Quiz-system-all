const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QuestionBankTopic = sequelize.define(
  "question_bank_topics",
  {
    topic_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(140),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: "question_bank_topics",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "question_bank_topic_owner_slug_uq",
        unique: true,
        fields: ["owner_id", "slug"]
      }
    ]
  }
);

module.exports = QuestionBankTopic;
