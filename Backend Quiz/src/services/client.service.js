const { Op } = require("sequelize");
const { Client, Department } = require("../models");
const {
  buildSubAdminClientWhere,
  canAccessClientId
} = require("../config/data-scope");
const {
  isSubAdmin,
  getSubAdminAccess,
  getAllowedDeptIds
} = require("../config/user-rights");

async function createClient(input) {
  const existing = await Client.findOne({ where: { slug: input.slug } });
  if (existing) {
    const error = new Error("Client slug already exists");
    error.statusCode = 409;
    throw error;
  }

  const client = await Client.create({
    name: input.name,
    slug: input.slug,
    contact_email: input.contact_email,
    logo_url: input.logo_url || null,
    primary_color: input.primary_color || "#1E3A5F",
    secondary_color: input.secondary_color || "#2E86AB",
    custom_domain: input.custom_domain || null,
    contact_phone: input.contact_phone || null,
    subscription_tier: input.subscription_tier || "standard",
    max_participants_per_session: input.max_participants_per_session || 500,
    features_enabled: input.features_enabled || {},
    is_active: input.is_active ?? true
  });

  return client;
}

async function resolveClientWhere(actor) {
  if (!isSubAdmin(actor)) return {};
  const mode = getSubAdminAccess(actor);
  if (mode === "all") return {};
  if (mode === "clients") {
    return buildSubAdminClientWhere(actor) || { client_id: -1 };
  }
  if (mode === "departments") {
    const deptIds = getAllowedDeptIds(actor);
    if (!deptIds.length) return { client_id: -1 };
    const depts = await Department.findAll({
      where: { dept_id: { [Op.in]: deptIds } },
      attributes: ["client_id"]
    });
    const clientIds = [...new Set(depts.map((d) => Number(d.client_id)).filter(Boolean))];
    return clientIds.length ? { client_id: { [Op.in]: clientIds } } : { client_id: -1 };
  }
  return {};
}

async function getClients(actor = null) {
  const where = await resolveClientWhere(actor);
  return Client.findAll({
    where,
    order: [["client_id", "DESC"]]
  });
}

async function getClientById(clientId, actor = null) {
  const client = await Client.findByPk(clientId);
  if (!client) {
    const error = new Error("Client not found");
    error.statusCode = 404;
    throw error;
  }
  if (actor && isSubAdmin(actor)) {
    const mode = getSubAdminAccess(actor);
    if (mode === "clients" && !canAccessClientId(actor, client.client_id)) {
      const error = new Error("Forbidden: client access denied");
      error.statusCode = 403;
      throw error;
    }
    if (mode === "departments") {
      const deptIds = getAllowedDeptIds(actor);
      const allowed = await Department.count({
        where: {
          client_id: client.client_id,
          dept_id: { [Op.in]: deptIds.length ? deptIds : [-1] }
        }
      });
      if (!allowed) {
        const error = new Error("Forbidden: client access denied");
        error.statusCode = 403;
        throw error;
      }
    }
  }
  return client;
}

module.exports = {
  createClient,
  getClients,
  getClientById
};
