"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("question_bank_packs", {
      pack_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      owner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(140),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      question_type: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex("question_bank_packs", ["owner_id", "slug"], {
      name: "question_bank_pack_owner_slug_uq",
      unique: true
    });
    await queryInterface.addIndex(
      "question_bank_packs",
      ["owner_id", "is_active", "question_type"],
      { name: "question_bank_pack_owner_filter_idx" }
    );

    await queryInterface.createTable("question_bank_pack_items", {
      pack_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      pack_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "question_bank_packs", key: "pack_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      bank_question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "question_bank_questions", key: "bank_question_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex(
      "question_bank_pack_items",
      ["pack_id", "bank_question_id"],
      { name: "question_bank_pack_item_uq", unique: true }
    );
    await queryInterface.addIndex("question_bank_pack_items", ["pack_id", "display_order"], {
      name: "question_bank_pack_item_order_idx"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("question_bank_pack_items");
    await queryInterface.dropTable("question_bank_packs");
  }
};
