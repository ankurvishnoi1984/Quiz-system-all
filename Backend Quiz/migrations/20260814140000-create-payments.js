"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payments", {
      payment_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      payment_reference: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      purpose: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: "plan_signup"
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "plans", key: "plan_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      payer_email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      payer_name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      company_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: "INR"
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "pending"
      },
      payment_method: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      provider: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "dummy"
      },
      provider_order_id: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      provider_payment_id: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      provider_signature: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      method_details: {
        type: Sequelize.JSON,
        allowNull: true
      },
      failure_reason: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      failed_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex("payments", ["payer_email"], {
      name: "payments_payer_email_idx"
    });
    await queryInterface.addIndex("payments", ["status"], {
      name: "payments_status_idx"
    });
    await queryInterface.addIndex("payments", ["user_id"], {
      name: "payments_user_id_idx"
    });
    await queryInterface.addIndex("payments", ["provider", "provider_payment_id"], {
      name: "payments_provider_payment_idx"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("payments");
  }
};
