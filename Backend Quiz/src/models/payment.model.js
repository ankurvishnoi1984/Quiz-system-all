const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Payment records — designed for dummy checkout today and Razorpay/Stripe later.
 * Never store full card numbers or CVV in method_details.
 */
const Payment = sequelize.define(
  "payments",
  {
    payment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payment_reference: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    purpose: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "plan_signup"
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    payer_email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    payer_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    company_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      defaultValue: null
    },
    /** Amount in smallest currency unit (paise for INR). */
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "INR"
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending"
    },
    payment_method: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null
    },
    /** dummy | razorpay | stripe — swap provider without schema changes. */
    provider: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "dummy"
    },
    /** Gateway order id (e.g. Razorpay order_xxx). */
    provider_order_id: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: null
    },
    /** Gateway payment/charge id (e.g. Razorpay pay_xxx). */
    provider_payment_id: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: null
    },
    provider_signature: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    },
    /** Safe display fields only: card last4/brand, upi_vpa, bank name, etc. */
    method_details: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    failure_reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    failed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: "payments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = Payment;
