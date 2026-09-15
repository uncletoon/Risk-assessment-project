/**
 * Form Input Validation Utility for ERIDSS
 * Strict validators to ensure no invalid names, numbers in names, or malformed data pass
 */

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validate Person Full Name
 * Disallows numbers, special symbols (only letters, spaces, hyphens, apostrophes, periods allowed)
 */
export function validateFullName(name: string): ValidationResult {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Full name is required.' };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters long.' };
  }
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Full name cannot exceed 100 characters.' };
  }

  // Strictly disallow numbers/digits
  if (/\d/.test(trimmed)) {
    return { isValid: false, error: 'Full name cannot contain numbers or digits.' };
  }

  // Strictly disallow special characters (allow letters, spaces, hyphens, apostrophes, periods, parentheses)
  const nameRegex = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s.'\-()]+$/;
  if (!nameRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Full name can only contain alphabetic letters, spaces, hyphens, and apostrophes.',
    };
  }

  // Must contain at least one letter
  if (!/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed)) {
    return { isValid: false, error: 'Full name must contain alphabetic letters.' };
  }

  return { isValid: true, error: null };
}

/**
 * Validate Email Address (Strict RFC format)
 */
export function validateEmail(email: string, isRequired = true): ValidationResult {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: 'Email address is required.' };
    }
    return { isValid: true, error: null };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. user@enterprise.rw).' };
  }
  return { isValid: true, error: null };
}

/**
 * Validate Phone Number (International / Local format: 8 to 15 digits)
 * Disallows letters and random symbols
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  const trimmed = (phone || '').trim();
  if (!trimmed) {
    return { isValid: true, error: null };
  }

  // Disallow letters
  if (/[a-zA-Z]/.test(trimmed)) {
    return { isValid: false, error: 'Phone number cannot contain letters.' };
  }

  // Check for allowed characters: optional leading +, digits, spaces, dashes, parentheses
  const allowedCharsRegex = /^\+?[0-9\s\-()]+$/;
  if (!allowedCharsRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid phone format. Only digits, spaces, hyphens, and leading + are allowed.',
    };
  }

  // Count actual numeric digits (standard ITU-T / E.164: 8 to 15 digits)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 8) {
    return {
      isValid: false,
      error: `Phone number is too short (${digitsOnly.length} digits). Minimum 8 digits required.`,
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      error: `Phone number is too long (${digitsOnly.length} digits). Maximum 15 digits allowed.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate District / Sector Name (Location names: letters, spaces, hyphens only, NO numbers)
 */
export function validateLocationName(value: string, fieldName: string): ValidationResult {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long.` };
  }

  // Strictly disallow numbers in district/sector
  if (/\d/.test(trimmed)) {
    return { isValid: false, error: `${fieldName} cannot contain numbers or digits.` };
  }

  const locationRegex = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s.'-]+$/;
  if (!locationRegex.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldName} can only contain alphabetic letters, spaces, and hyphens.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate Business Type / Industry Sector (letters, spaces, &, /, hyphens, commas)
 */
export function validateBusinessCategory(value: string, fieldName = 'Business Type'): ValidationResult {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long.` };
  }

  const categoryRegex = /^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s&/,\-.'()]+$/;
  if (!categoryRegex.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldName} contains invalid special characters.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate Organization Legal / Trade Name
 */
export function validateOrgName(name: string): ValidationResult {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Organization name is required.' };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Organization name must be at least 2 characters long.' };
  }
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Organization name cannot exceed 200 characters.' };
  }

  const orgRegex = /^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s&/,\-.'()]+$/;
  if (!orgRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Organization name contains invalid special characters.',
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate Required Text Field
 */
export function validateRequired(value: string, fieldName: string, minLength = 2): ValidationResult {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (trimmed.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters.` };
  }
  return { isValid: true, error: null };
}

/**
 * Validate Password
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long.' };
  }
  return { isValid: true, error: null };
}
