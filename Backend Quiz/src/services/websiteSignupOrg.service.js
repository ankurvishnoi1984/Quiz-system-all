const { Client, Department } = require("../models");
const {
  WEBSITE_SIGNUP_CLIENT,
  WEBSITE_SIGNUP_DEPARTMENT
} = require("../constants/websiteSignupOrg");

async function getWebsiteSignupOrganization({ transaction } = {}) {
  const [client] = await Client.findOrCreate({
    where: { slug: WEBSITE_SIGNUP_CLIENT.slug },
    defaults: {
      name: WEBSITE_SIGNUP_CLIENT.name,
      slug: WEBSITE_SIGNUP_CLIENT.slug,
      contact_email: WEBSITE_SIGNUP_CLIENT.contact_email,
      subscription_tier: WEBSITE_SIGNUP_CLIENT.subscription_tier,
      max_participants_per_session: 500,
      is_active: true
    },
    transaction
  });

  const [department] = await Department.findOrCreate({
    where: {
      client_id: client.client_id,
      slug: WEBSITE_SIGNUP_DEPARTMENT.slug
    },
    defaults: {
      client_id: client.client_id,
      name: WEBSITE_SIGNUP_DEPARTMENT.name,
      slug: WEBSITE_SIGNUP_DEPARTMENT.slug,
      description: WEBSITE_SIGNUP_DEPARTMENT.description,
      default_max_participants: 500,
      is_active: true
    },
    transaction
  });

  return { client, department };
}

module.exports = {
  getWebsiteSignupOrganization
};
