/** Shared tenant for hosts who register via the public marketing website. */
const WEBSITE_SIGNUP_CLIENT = {
  name: "High Voltage Interactive",
  slug: "high-voltage-interactive",
  contact_email: "support@netcastservice.online",
  subscription_tier: "standard"
};

const WEBSITE_SIGNUP_DEPARTMENT = {
  name: "Website Registered Hosts",
  slug: "website-registered-hosts",
  description: "Hosts who created accounts through the public website registration flow."
};

module.exports = {
  WEBSITE_SIGNUP_CLIENT,
  WEBSITE_SIGNUP_DEPARTMENT
};
