const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QuestionBankPackItem = sequelize.define(
  "question_bank_pack_items",
  {
    pack_item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pack_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    bank_question_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    tableName: "question_bank_pack_items",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = QuestionBankPackItem;
