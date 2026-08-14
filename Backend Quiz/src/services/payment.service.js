const { Plan, Payment, User } = require("../models");
const { randomBytes } = require("crypto");

const PAYMENT_TTL_MS = 30 * 60 * 1000;
const DUMMY_FAILURE_RATE = 0;

const PAYMENT_STATUSES = {
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded"
};

const PAYMENT_METHODS = {
  CARD: "card",
  UPI: "upi",
  NETBANKING: "netbanking",
  WALLET: "wallet"
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function generatePaymentReference() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `PAY-${stamp}-${suffix}`;
}

function generateDummyProviderPaymentId() {
  return `dummy_pay_${randomBytes(8).toString("hex")}`;
}

function planAmountInSmallestUnit(plan) {
  const rupees = Number(plan.price_monthly);
  if (!Number.isFinite(rupees) || rupees < 0) {
    const error = new Error("Selected plan does not have a valid price");
    error.statusCode = 400;
    throw error;
  }
  const currency = String(plan.currency || "INR").toUpperCase();
  if (currency === "INR") return Math.round(rupees * 100);
  return Math.round(rupees * 100);
}

function detectCardBrand(cardNumber) {
  const digits = String(cardNumber || "").replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  if (/^6/.test(digits)) return "rupay";
  return "card";
}

function maskUpiVpa(vpa) {
  const text = String(vpa || "").trim();
  const at = text.indexOf("@");
  if (at <= 1) return text;
  const handle = text.slice(at);
  const name = text.slice(0, at);
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}${handle}`;
}

function sanitizeCardDetails(input = {}) {
  const cardNumber = String(input.card_number || "").replace(/\D/g, "");
  if (cardNumber.length < 13 || cardNumber.length > 19) {
    const error = new Error("Enter a valid card number");
    error.statusCode = 400;
    throw error;
  }

  const holderName = String(input.cardholder_name || input.card_holder_name || "").trim();
  if (!holderName) {
    const error = new Error("Cardholder name is required");
    error.statusCode = 400;
    throw error;
  }

  const expiry = String(input.expiry || input.expiry_month_year || "").trim();
  if (!/^\d{2}\/\d{2,4}$/.test(expiry)) {
    const error = new Error("Expiry must be MM/YY or MM/YYYY");
    error.statusCode = 400;
    throw error;
  }

  const cvv = String(input.cvv || "").replace(/\D/g, "");
  if (cvv.length < 3 || cvv.length > 4) {
    const error = new Error("Enter a valid CVV");
    error.statusCode = 400;
    throw error;
  }

  return {
    cardholder_name: holderName,
    card_brand: detectCardBrand(cardNumber),
    card_last4: cardNumber.slice(-4),
    expiry
  };
}

function sanitizeUpiDetails(input = {}) {
  const vpa = String(input.upi_vpa || input.vpa || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i.test(vpa)) {
    const error = new Error("Enter a valid UPI ID (e.g. name@upi)");
    error.statusCode = 400;
    throw error;
  }

  const payerName = String(input.payer_name || "").trim();
  return {
    upi_vpa: vpa,
    upi_vpa_masked: maskUpiVpa(vpa),
    payer_name: payerName || null
  };
}

function toPaymentPayload(payment, plan = null) {
  return {
    payment_id: payment.payment_id,
    payment_reference: payment.payment_reference,
    purpose: payment.purpose,
    plan_id: payment.plan_id,
    plan_name: plan?.name || null,
    user_id: payment.user_id,
    payer_email: payment.payer_email,
    payer_name: payment.payer_name,
    company_name: payment.company_name,
    amount: payment.amount,
    currency: payment.currency,
    amount_display: formatAmount(payment.amount, payment.currency),
    status: payment.status,
    payment_method: payment.payment_method,
    provider: payment.provider,
    provider_order_id: payment.provider_order_id,
    provider_payment_id: payment.provider_payment_id,
    method_details: payment.method_details,
    paid_at: payment.paid_at,
    expires_at: payment.expires_at
  };
}

function formatAmount(amount, currency = "INR") {
  const value = Number(amount || 0);
  const code = String(currency || "INR").toUpperCase();
  const major = value / 100;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0
    }).format(major);
  } catch {
    return `${code} ${major}`;
  }
}

async function getPlanForCheckout(planId) {
  const plan = await Plan.findOne({
    where: { plan_id: planId, is_active: true, is_free: false }
  });
  if (!plan) {
    const error = new Error("Selected plan is not available for purchase");
    error.statusCode = 400;
    throw error;
  }
  if (plan.price_monthly == null) {
    const error = new Error("Selected plan does not have a price configured");
    error.statusCode = 400;
    throw error;
  }
  return plan;
}

async function initiatePayment(input) {
  const planId = Number(input.plan_id);
  const payerName = String(input.payer_name || "").trim();
  const companyName = input.company_name ? String(input.company_name).trim() : null;

  const plan = await getPlanForCheckout(planId);
  const email = normalizeEmail(input.email);

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const amount = planAmountInSmallestUnit(plan);
  const currency = String(plan.currency || "INR").toUpperCase();
  const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS);

  const payment = await Payment.create({
    payment_reference: generatePaymentReference(),
    purpose: input.purpose || "plan_signup",
    plan_id: plan.plan_id,
    payer_email: email,
    payer_name: payerName,
    company_name: companyName,
    amount,
    currency,
    status: PAYMENT_STATUSES.PENDING,
    provider: "dummy",
    provider_order_id: `dummy_ord_${randomBytes(6).toString("hex")}`,
    expires_at: expiresAt,
    metadata: {
      source: "website",
      plan_name: plan.name
    }
  });

  return toPaymentPayload(payment, plan);
}

async function getPaymentOrThrow(paymentId) {
  const payment = await Payment.findByPk(Number(paymentId));
  if (!payment) {
    const error = new Error("Payment not found");
    error.statusCode = 404;
    throw error;
  }
  return payment;
}

function assertPaymentNotExpired(payment) {
  if (payment.expires_at && new Date(payment.expires_at).getTime() < Date.now()) {
    const error = new Error("Payment session expired. Please start checkout again.");
    error.statusCode = 410;
    throw error;
  }
}

async function confirmDummyPayment(input) {
  const payment = await getPaymentOrThrow(input.payment_id);
  assertPaymentNotExpired(payment);

  if (payment.status === PAYMENT_STATUSES.PAID) {
    if (payment.user_id) {
      const error = new Error("This payment has already been used");
      error.statusCode = 409;
      throw error;
    }
    return toPaymentPayload(payment);
  }

  if (payment.status !== PAYMENT_STATUSES.PENDING) {
    const error = new Error(`Payment cannot be confirmed in ${payment.status} status`);
    error.statusCode = 400;
    throw error;
  }

  const method = String(input.payment_method || "").toLowerCase();
  if (!Object.values(PAYMENT_METHODS).includes(method)) {
    const error = new Error("payment_method must be card or upi");
    error.statusCode = 400;
    throw error;
  }

  if (normalizeEmail(input.email) !== payment.payer_email) {
    const error = new Error("Payment email does not match checkout details");
    error.statusCode = 400;
    throw error;
  }

  await payment.update({ status: PAYMENT_STATUSES.PROCESSING });

  let methodDetails = null;
  if (method === PAYMENT_METHODS.CARD) {
    methodDetails = sanitizeCardDetails(input);
  } else if (method === PAYMENT_METHODS.UPI) {
    methodDetails = sanitizeUpiDetails(input);
  }

  if (DUMMY_FAILURE_RATE > 0 && Math.random() < DUMMY_FAILURE_RATE) {
    await payment.update({
      status: PAYMENT_STATUSES.FAILED,
      payment_method: method,
      method_details: methodDetails,
      failure_reason: "Simulated payment failure (demo mode)",
      failed_at: new Date()
    });
    const error = new Error("Payment failed. Please try again.");
    error.statusCode = 402;
    throw error;
  }

  const paidAt = new Date();
  await payment.update({
    status: PAYMENT_STATUSES.PAID,
    payment_method: method,
    method_details: methodDetails,
    provider_payment_id: generateDummyProviderPaymentId(),
    paid_at: paidAt,
    failure_reason: null,
    failed_at: null
  });

  await payment.reload();
  const plan = await Plan.findByPk(payment.plan_id);
  return toPaymentPayload(payment, plan);
}

async function assertPaymentEligibleForSignup({ paymentId, email, planId }) {
  const payment = await getPaymentOrThrow(paymentId);
  assertPaymentNotExpired(payment);

  if (payment.status !== PAYMENT_STATUSES.PAID) {
    const error = new Error("A successful payment is required before signup");
    error.statusCode = 402;
    throw error;
  }

  if (payment.user_id) {
    const error = new Error("This payment has already been used for an account");
    error.statusCode = 409;
    throw error;
  }

  if (normalizeEmail(email) !== payment.payer_email) {
    const error = new Error("Signup email must match the payment email");
    error.statusCode = 400;
    throw error;
  }

  if (Number(planId) !== Number(payment.plan_id)) {
    const error = new Error("Selected plan does not match the paid plan");
    error.statusCode = 400;
    throw error;
  }

  if (payment.purpose !== "plan_signup") {
    const error = new Error("Invalid payment purpose for signup");
    error.statusCode = 400;
    throw error;
  }

  return payment;
}

async function linkPaymentToUser(paymentId, userId, { transaction } = {}) {
  const payment = await getPaymentOrThrow(paymentId);
  await payment.update({ user_id: userId }, { transaction });
  return payment;
}

module.exports = {
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  formatAmount,
  initiatePayment,
  confirmDummyPayment,
  assertPaymentEligibleForSignup,
  linkPaymentToUser,
  toPaymentPayload
};
