/**
 * Backend Validation Utility for ERIDSS
 * Enforces strict validation so no invalid names, digits in names, or malformed data are saved to DB
 */

function validateFullName(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    throw new Error("Full name is required.");
  }
  if (trimmed.length < 2) {
    throw new Error("Full name must be at least 2 characters long.");
  }
  if (trimmed.length > 100) {
    throw new Error("Full name cannot exceed 100 characters.");
  }
  if (/\d/.test(trimmed)) {
    throw new Error("Full name cannot contain numbers or digits.");
  }
  const nameRegex = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s.'\-()]+$/;
  if (!nameRegex.test(trimmed)) {
    throw new Error(
      "Full name can only contain alphabetic letters, spaces, hyphens, and apostrophes.",
    );
  }
  return trimmed;
}

function validateEmail(email, isRequired = true) {
  const trimmed = (email || "").trim();
  if (!trimmed) {
    if (isRequired) {
      throw new Error("Email address is required.");
    }
    return null;
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error("Invalid email address format.");
  }
  return trimmed.toLowerCase();
}

function validatePhoneNumber(phone) {
  const trimmed = (phone || "").trim();
  if (!trimmed) return null;

  if (/[a-zA-Z]/.test(trimmed)) {
    throw new Error("Phone number cannot contain letters.");
  }
  const allowed = /^\+?[0-9\s\-()]+$/;
  if (!allowed.test(trimmed)) {
    throw new Error(
      "Invalid phone format. Only digits, spaces, hyphens, and leading + are allowed.",
    );
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    throw new Error(
      `Phone number must contain between 8 and 15 digits (got ${digitsOnly.length}).`,
    );
  }
  return trimmed;
}

function validateLocationName(value, fieldName = "Location") {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  if (/\d/.test(trimmed)) {
    throw new Error(`${fieldName} cannot contain numbers or digits.`);
  }
  const regex = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s.'-]+$/;
  if (!regex.test(trimmed)) {
    throw new Error(
      `${fieldName} can only contain alphabetic letters, spaces, and hyphens.`,
    );
  }
  return trimmed;
}

function validateOrgName(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    throw new Error("Organization name is required.");
  }
  if (trimmed.length < 2) {
    throw new Error("Organization name must be at least 2 characters long.");
  }
  const regex = /^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s&/,\-._'()]+$/;
  if (!regex.test(trimmed)) {
    throw new Error("Organization name contains invalid special characters.");
  }
  return trimmed;
}

async function checkUserUniqueness(
  pool,
  { email, phoneNumber, excludeUserId = null },
) {
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    let query = "SELECT id FROM users WHERE LOWER(email) = $1";
    const params = [cleanEmail];
    if (excludeUserId) {
      query += " AND id != $2";
      params.push(excludeUserId);
    }
    const existing = await pool.query(query, params);
    if (existing.rows.length > 0) {
      throw new Error(
        `Email address '${email}' is already in use by another account.`,
      );
    }
  }

  if (phoneNumber && phoneNumber.trim()) {
    const cleanPhone = phoneNumber.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, "");
    let query = `
      SELECT id, full_name, phone_number 
      FROM users 
      WHERE phone_number IS NOT NULL 
        AND (
          phone_number = $1 
          OR regexp_replace(phone_number, '[^0-9]', '', 'g') = $2
        )
    `;
    const params = [cleanPhone, cleanDigits];
    if (excludeUserId) {
      query += " AND id != $3";
      params.push(excludeUserId);
    }
    const existing = await pool.query(query, params);
    if (existing.rows.length > 0) {
      throw new Error(
        `Phone number '${phoneNumber}' is already in use by another account.`,
      );
    }
  }
}

async function checkOrganizationUniqueness(
  pool,
  { name, excludeOrgId = null },
) {
  if (name && name.trim()) {
    const cleanName = name.trim().toLowerCase();
    let query =
      "SELECT id, name FROM organizations WHERE LOWER(TRIM(name)) = $1";
    const params = [cleanName];
    if (excludeOrgId) {
      query += " AND id != $2";
      params.push(excludeOrgId);
    }
    const existing = await pool.query(query, params);
    if (existing.rows.length > 0) {
      throw new Error(
        `An organization named '${name.trim()}' is already registered. Please use a unique organization name.`,
      );
    }
  }
}

module.exports = {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validateLocationName,
  validateOrgName,
  checkUserUniqueness,
  checkOrganizationUniqueness,
};
