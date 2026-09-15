// ============================================================================
// Organization Service
// ============================================================================

const { pool } = require("../config/db");

async function getOrganizations() {
  const res = await pool.query("SELECT * FROM organizations ORDER BY name ASC");
  return res.rows;
}

async function getOrganizationById(id) {
  const res = await pool.query("SELECT * FROM organizations WHERE id = $1", [
    id,
  ]);
  if (res.rows.length === 0) {
    throw new Error("Organization not found");
  }
  return res.rows[0];
}

const {
  validateOrgName,
  validateEmail,
  validateLocationName,
  checkOrganizationUniqueness,
} = require("../utils/validation");

async function createOrganization({
  name,
  industry,
  description,
  contact_email,
  business_type,
  district,
  sector,
  street_number,
  product_types,
}) {
  const cleanName = validateOrgName(name);
  await checkOrganizationUniqueness(pool, { name: cleanName });

  const cleanDistrict = district
    ? validateLocationName(district, "District")
    : "";
  const cleanSector = sector ? validateLocationName(sector, "Sector") : "";
  const cleanEmail = contact_email ? validateEmail(contact_email, false) : "";

  const res = await pool.query(
    `INSERT INTO organizations (name, industry, description, contact_email, business_type, district, sector, street_number, product_types)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      cleanName,
      industry || "Financial & Enterprise Services",
      description || "",
      cleanEmail || "",
      business_type || "",
      cleanDistrict || "",
      cleanSector || "",
      street_number || "",
      product_types || "",
    ],
  );
  return res.rows[0];
}

async function updateOrganization(
  id,
  {
    name,
    industry,
    description,
    contact_email,
    business_type,
    district,
    sector,
    street_number,
    product_types,
  },
) {
  const cleanName = name ? validateOrgName(name) : null;
  if (cleanName) {
    await checkOrganizationUniqueness(pool, {
      name: cleanName,
      excludeOrgId: id,
    });
  }
  const cleanDistrict = district
    ? validateLocationName(district, "District")
    : null;
  const cleanSector = sector ? validateLocationName(sector, "Sector") : null;
  const cleanEmail = contact_email ? validateEmail(contact_email, false) : null;

  const res = await pool.query(
    `UPDATE organizations 
     SET name = COALESCE($1, name),
         industry = COALESCE($2, industry),
         description = COALESCE($3, description),
         contact_email = COALESCE($4, contact_email),
         business_type = COALESCE($5, business_type),
         district = COALESCE($6, district),
         sector = COALESCE($7, sector),
         street_number = COALESCE($8, street_number),
         product_types = COALESCE($9, product_types),
         updated_at = NOW()
     WHERE id = $10
     RETURNING *`,
    [
      cleanName,
      industry,
      description,
      cleanEmail,
      business_type,
      cleanDistrict,
      cleanSector,
      street_number,
      product_types,
      id,
    ],
  );
  if (res.rows.length === 0) {
    throw new Error("Organization not found");
  }
  return res.rows[0];
}

const DEFAULT_METHODOLOGY = {
  matrix_dimension: 5,
  likelihood_scale: [
    { level: 1, label: "Rare", description: "< 5% probability in 12 months" },
    { level: 2, label: "Unlikely", description: "5% - 25% probability" },
    { level: 3, label: "Possible", description: "25% - 50% probability" },
    { level: 4, label: "Likely", description: "50% - 75% probability" },
    {
      level: 5,
      label: "Almost Certain",
      description: "> 75% probability in 12 months",
    },
  ],
  impact_scale: [
    { level: 1, label: "Insignificant", description: "< 1% operating margin" },
    { level: 2, label: "Minor", description: "1% - 5% operating margin" },
    { level: 3, label: "Moderate", description: "5% - 15% operating margin" },
    { level: 4, label: "Major", description: "15% - 30% operating margin" },
    { level: 5, label: "Severe", description: "> 30% catastrophic impact" },
  ],
  score_bands: [
    { name: "Very Low", min_score: 0, max_score: 20, color: "#10B981" },
    { name: "Low", min_score: 21, max_score: 40, color: "#3B82F6" },
    { name: "Moderate", min_score: 41, max_score: 60, color: "#F59E0B" },
    { name: "High", min_score: 61, max_score: 80, color: "#EF4444" },
    { name: "Critical", min_score: 81, max_score: 100, color: "#991B1B" },
  ],
  category_weights: {
    FINANCIAL: 25.0,
    OPERATIONAL: 25.0,
    STRATEGIC: 20.0,
    LEGAL_REGULATORY: 15.0,
    MARKET: 15.0,
  },
};

async function getOrganizationMethodology(orgId) {
  const org = await getOrganizationById(orgId);
  if (org.methodology_config && typeof org.methodology_config === "object") {
    return {
      ...DEFAULT_METHODOLOGY,
      ...org.methodology_config,
      is_custom: true,
    };
  }
  return {
    ...DEFAULT_METHODOLOGY,
    is_custom: false,
  };
}

async function updateOrganizationMethodology(orgId, config) {
  if (!config || typeof config !== "object") {
    throw new Error("Methodology configuration object is required");
  }

  // Validate matrix dimensions (3 to 5)
  const dimension = Number(config.matrix_dimension) || 5;
  if (dimension < 3 || dimension > 5) {
    throw new Error(
      "Matrix dimension must be between 3 and 5 (e.g. 3x3, 4x4, 5x5)",
    );
  }

  // Validate category weights sum to 100% with floating point tolerance of +-0.01
  if (config.category_weights && typeof config.category_weights === "object") {
    const weights = Object.values(config.category_weights).map(
      (w) => Number(w) || 0,
    );
    const sum = weights.reduce((acc, curr) => acc + curr, 0);
    if (Math.abs(sum - 100.0) > 0.01) {
      throw new Error(
        `Active category weights must sum to 100.0% (Current sum: ${Math.round(sum * 100) / 100}%)`,
      );
    }
  }

  const cleanConfig = {
    matrix_dimension: dimension,
    likelihood_scale:
      config.likelihood_scale ||
      DEFAULT_METHODOLOGY.likelihood_scale.slice(0, dimension),
    impact_scale:
      config.impact_scale ||
      DEFAULT_METHODOLOGY.impact_scale.slice(0, dimension),
    score_bands: config.score_bands || DEFAULT_METHODOLOGY.score_bands,
    category_weights:
      config.category_weights || DEFAULT_METHODOLOGY.category_weights,
    updated_at: new Date().toISOString(),
  };

  const res = await pool.query(
    `UPDATE organizations
     SET methodology_config = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, methodology_config`,
    [JSON.stringify(cleanConfig), orgId],
  );

  if (res.rows.length === 0) {
    throw new Error("Organization not found");
  }

  return cleanConfig;
}

module.exports = {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  getOrganizationMethodology,
  updateOrganizationMethodology,
};
