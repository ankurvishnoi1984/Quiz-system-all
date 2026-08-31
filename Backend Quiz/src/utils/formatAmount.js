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

module.exports = { formatAmount };
