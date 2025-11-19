/**
 * Auth Validator - Pure Validation Functions
 * NO Firebase dependencies - can be used in Node tests
 */

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {object} { valid: boolean, errors: Array<string>, strength: string }
 */
export function validatePassword(password) {
  const errors = [];
  let strength = 'weak';

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { valid: false, errors, strength };
  }

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (password.length >= 12) {
    strength = 'strong';
  } else if (password.length >= 8) {
    strength = 'medium';
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar) {
    if (strength === 'medium') strength = 'strong';
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}
