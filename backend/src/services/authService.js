// ============================================================================
// Auth Service
// ============================================================================

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const JWT_SECRET =
  process.env.JWT_SECRET || "eridss-enterprise-risk-secret-key-2026";

async function authenticateUser(email, password) {
  const res = await pool.query(
    `SELECT u.*, o.name as organization_name 
     FROM users u
     LEFT JOIN organizations o ON u.organization_id = o.id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email],
  );

  if (res.rows.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = res.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  if (user.status === "pending") {
    throw new Error(
      "Your employee account is pending approval by your organization's Risk Officer.",
    );
  }
  if (user.status === "rejected") {
    throw new Error(
      "Your employee account registration was declined by your organization.",
    );
  }
  if (user.status === "inactive" || user.status === "suspended") {
    throw new Error(
      "Your account has been deactivated. Please contact your organization administrator.",
    );
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone_number: user.phone_number,
    gender: user.gender,
    role: user.role,
    department: user.department,
    organization_id: user.organization_id,
    organization_name: user.organization_name,
    status: user.status,
    token,
  };
}

async function getUserById(userId) {
  const res = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.phone_number, u.gender, u.role, u.department, u.status, u.organization_id, o.name as organization_name
     FROM users u
     LEFT JOIN organizations o ON u.organization_id = o.id
     WHERE u.id = $1`,
    [userId],
  );
  if (res.rows.length === 0) {
    throw new Error("User not found");
  }
  return res.rows[0];
}

const {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validateOrgName,
  validateLocationName,
  checkUserUniqueness,
  checkOrganizationUniqueness,
} = require("../utils/validation");

async function registerRiskOfficer({
  fullName,
  full_name,
  email,
  phoneNumber,
  phone_number,
  gender,
  password,
  organization,
}) {
  const name = validateFullName(fullName || full_name);
  const cleanEmail = validateEmail(email, true);
  const phone = validatePhoneNumber(phoneNumber || phone_number);

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  if (!organization || typeof organization !== "object") {
    throw new Error(
      "Enterprise business information is required to complete registration.",
    );
  }

  const orgName = validateOrgName(organization.name);
  const industry = (
    organization.industry || "Financial & Enterprise Services"
  ).trim();
  const businessType = (
    organization.business_type ||
    organization.businessType ||
    "Microfinance & Digital Lending"
  ).trim();
  const district = organization.district
    ? validateLocationName(organization.district, "District")
    : "Nyarugenge";
  const sector = organization.sector
    ? validateLocationName(organization.sector, "Sector")
    : "Nyarugenge";
  const streetNumber = (
    organization.street_number ||
    organization.streetNumber ||
    ""
  ).trim();
  const productTypes = (
    organization.product_types ||
    organization.productTypes ||
    ""
  ).trim();
  const contactEmail = organization.contact_email
    ? validateEmail(organization.contact_email, false)
    : "";
  const description = (organization.description || "").trim();

  // Validate uniqueness
  await checkUserUniqueness(pool, { email: cleanEmail, phoneNumber: phone });
  await checkOrganizationUniqueness(pool, { name: orgName });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create Organization
    const orgRes = await client.query(
      `INSERT INTO organizations (name, industry, description, contact_email, business_type, district, sector, street_number, product_types)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        orgName,
        industry,
        description,
        contactEmail,
        businessType,
        district,
        sector,
        streetNumber,
        productTypes,
      ],
    );
    const newOrg = orgRes.rows[0];

    // 2. Hash Password and Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (organization_id, full_name, email, password, phone_number, gender, role, department, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'RISK_OFFICER', 'Risk Management', 'active')
       RETURNING id, organization_id, full_name, email, phone_number, gender, role, department, status, created_at`,
      [newOrg.id, name, cleanEmail, hashedPassword, phone, gender || "Male"],
    );
    const newUser = userRes.rows[0];

    // 3. Log Audit
    await client.query(
      `INSERT INTO audit_logs (user_id, organization_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newUser.id,
        newOrg.id,
        "USER_REGISTERED",
        "users",
        newUser.id,
        JSON.stringify({
          email: cleanEmail,
          organization_name: newOrg.name,
          role: "RISK_OFFICER",
        }),
      ],
    );

    await client.query("COMMIT");

    // 4. Generate JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        organization_id: newOrg.id,
        full_name: newUser.full_name,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    return {
      token,
      user: {
        id: newUser.id,
        organization_id: newOrg.id,
        organization_name: newOrg.name,
        full_name: newUser.full_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        gender: newUser.gender,
        role: newUser.role,
        department: newUser.department,
        status: newUser.status,
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateUserProfile(
  userId,
  { fullName, email, phoneNumber, gender },
) {
  const cleanName = fullName ? validateFullName(fullName) : null;
  const cleanEmail = email ? validateEmail(email, true) : null;
  const cleanPhone = phoneNumber ? validatePhoneNumber(phoneNumber) : null;

  // Check email and phone uniqueness in database
  await checkUserUniqueness(pool, {
    email: cleanEmail,
    phoneNumber: cleanPhone,
    excludeUserId: userId,
  });

  const res = await pool.query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         email = COALESCE($2, email),
         phone_number = COALESCE($3, phone_number),
         gender = COALESCE($4, gender),
         updated_at = NOW()
     WHERE id = $5
     RETURNING id, full_name, email, phone_number, gender, role, department, status, organization_id`,
    [cleanName, cleanEmail, cleanPhone, gender, userId],
  );

  if (res.rows.length === 0) {
    throw new Error("User not found");
  }

  const updatedUser = res.rows[0];

  // Fetch organization name
  const orgRes = await pool.query(
    "SELECT name FROM organizations WHERE id = $1",
    [updatedUser.organization_id],
  );
  updatedUser.organization_name = orgRes.rows[0]?.name || "";

  // Generate fresh token with updated details
  const token = jwt.sign(
    {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      organization_id: updatedUser.organization_id,
      full_name: updatedUser.full_name,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

  return {
    ...updatedUser,
    token,
  };
}

async function registerEmployee({
  fullName,
  full_name,
  email,
  phoneNumber,
  phone_number,
  gender,
  password,
  organizationId,
  organization_id,
  department,
}) {
  const name = validateFullName(fullName || full_name);
  const cleanEmail = validateEmail(email, true);
  const phone = validatePhoneNumber(phoneNumber || phone_number);
  const orgId = parseInt(organizationId || organization_id, 10);

  if (!orgId) {
    throw new Error("Please select the business organization you belong to.");
  }

  const orgRes = await pool.query(
    "SELECT id, name FROM organizations WHERE id = $1",
    [orgId],
  );
  if (orgRes.rows.length === 0) {
    throw new Error("Selected organization does not exist.");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  // Check email and phone uniqueness across users
  await checkUserUniqueness(pool, {
    email: cleanEmail,
    phoneNumber: phone,
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  const res = await pool.query(
    `INSERT INTO users (organization_id, full_name, email, password, phone_number, gender, role, department, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'EMPLOYEE', $7, 'pending')
     RETURNING id, organization_id, full_name, email, phone_number, gender, role, department, status, created_at`,
    [
      orgId,
      name,
      cleanEmail,
      hashedPassword,
      phone,
      gender || null,
      (department || "Operations").trim(),
    ],
  );

  const newUser = res.rows[0];

  // Audit log
  await pool.query(
    `INSERT INTO audit_logs (user_id, organization_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      newUser.id,
      orgId,
      "EMPLOYEE_REGISTERED_PENDING",
      "users",
      newUser.id,
      JSON.stringify({
        email: cleanEmail,
        organization_name: orgRes.rows[0].name,
        role: "EMPLOYEE",
        status: "pending",
      }),
    ],
  );

  return {
    message:
      "Registration submitted successfully! Your account is pending approval by your organization's Risk Officer.",
    user: {
      id: newUser.id,
      full_name: newUser.full_name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      organization_id: orgId,
      organization_name: orgRes.rows[0].name,
    },
  };
}

module.exports = {
  authenticateUser,
  getUserById,
  updateUserProfile,
  registerRiskOfficer,
  registerEmployee,
  JWT_SECRET,
};
