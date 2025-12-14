/**
 * Validation utilities for ZenCLI
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Create a validation result
 */
export function createValidationResult(
  isValid: boolean,
  errors: string[] = [],
  warnings: string[] = []
): ValidationResult {
  return { isValid, errors, warnings };
}

/**
 * Validate an email address
 * @param email Email to validate
 * @returns Validation result
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!email) {
    errors.push("Email is required");
    return createValidationResult(false, errors, warnings);
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Email format is invalid");
  }

  // Check for common disposable email domains
  const disposableDomains = [
    "tempmail.com",
    "throwawaymail.com",
    "mailinator.com",
    "guerrillamail.com",
    "10minutemail.com",
    "yopmail.com",
    "trashmail.com",
  ];

  const domain = email.split("@")[1]?.toLowerCase();
  if (domain && disposableDomains.some((d) => domain.includes(d))) {
    warnings.push("Email appears to be from a disposable email service");
  }

  // Check length
  if (email.length > 254) {
    errors.push("Email is too long (max 254 characters)");
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate a password
 * @param password Password to validate
 * @param options Validation options
 * @returns Validation result
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}
): ValidationResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!password) {
    errors.push("Password is required");
    return createValidationResult(false, errors, warnings);
  }

  // Check length
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  // Check for uppercase letters
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Check for lowercase letters
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Check for numbers
  if (requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check for special characters
  if (
    requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push("Password must contain at least one special character");
  }

  // Check for common passwords
  const commonPasswords = [
    "password",
    "123456",
    "qwerty",
    "admin",
    "welcome",
    "password123",
    "letmein",
    "monkey",
    "dragon",
    "sunshine",
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    warnings.push("Password is too common and easily guessable");
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    warnings.push("Password contains repeated characters");
  }

  // Check for sequential numbers or letters
  if (
    /123|234|345|456|567|678|789|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(
      password
    )
  ) {
    warnings.push("Password contains sequential characters");
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate a username
 * @param username Username to validate
 * @param options Validation options
 * @returns Validation result
 */
export function validateUsername(
  username: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowedChars?: RegExp;
    disallowedWords?: string[];
  } = {}
): ValidationResult {
  const {
    minLength = 3,
    maxLength = 30,
    allowedChars = /^[a-zA-Z0-9_.-]+$/,
    disallowedWords = ["admin", "root", "system", "moderator"],
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!username) {
    errors.push("Username is required");
    return createValidationResult(false, errors, warnings);
  }

  // Check length
  if (username.length < minLength) {
    errors.push(`Username must be at least ${minLength} characters long`);
  }

  if (username.length > maxLength) {
    errors.push(`Username must be at most ${maxLength} characters long`);
  }

  // Check allowed characters
  if (!allowedChars.test(username)) {
    errors.push("Username contains invalid characters");
  }

  // Check for disallowed words
  const lowerUsername = username.toLowerCase();
  for (const word of disallowedWords) {
    if (lowerUsername.includes(word.toLowerCase())) {
      warnings.push(`Username contains the disallowed word "${word}"`);
    }
  }

  // Check for reserved usernames
  const reservedUsernames = [
    "admin",
    "administrator",
    "root",
    "system",
    "moderator",
    "support",
    "help",
    "info",
    "contact",
    "service",
  ];

  if (reservedUsernames.includes(lowerUsername)) {
    warnings.push("This username is reserved and may not be available");
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate a URL
 * @param url URL to validate
 * @param options Validation options
 * @returns Validation result
 */
export function validateUrl(
  url: string,
  options: {
    requireProtocol?: boolean;
    allowedProtocols?: string[];
    requireTld?: boolean;
  } = {}
): ValidationResult {
  const {
    requireProtocol = true,
    allowedProtocols = ["http:", "https:", "ftp:", "mailto:"],
    requireTld = true,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url) {
    errors.push("URL is required");
    return createValidationResult(false, errors, warnings);
  }

  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (requireProtocol && !parsedUrl.protocol) {
      errors.push("URL must include a protocol (http://, https://, etc.)");
    }

    if (
      allowedProtocols.length > 0 &&
      !allowedProtocols.includes(parsedUrl.protocol)
    ) {
      errors.push(
        `URL protocol must be one of: ${allowedProtocols.join(", ")}`
      );
    }

    // Check TLD
    if (requireTld) {
      const hostname = parsedUrl.hostname;
      const tldRegex = /\.[a-z]{2,}$/i;
      if (!tldRegex.test(hostname)) {
        warnings.push("URL may be missing a valid top-level domain (TLD)");
      }
    }

    // Check for localhost or private IP addresses
    if (
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname.startsWith("127.") ||
      parsedUrl.hostname === "::1"
    ) {
      warnings.push("URL points to localhost");
    }

    // Check for very long URLs
    if (url.length > 2048) {
      warnings.push("URL is very long and may cause issues");
    }
  } catch (error) {
    errors.push("URL format is invalid");
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate a phone number
 * @param phone Phone number to validate
 * @param options Validation options
 * @returns Validation result
 */
export function validatePhone(
  phone: string,
  options: {
    countryCode?: string;
    requireCountryCode?: boolean;
  } = {}
): ValidationResult {
  const {
    countryCode = "84", // Vietnam default
    requireCountryCode = false,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!phone) {
    errors.push("Phone number is required");
    return createValidationResult(false, errors, warnings);
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Check length
  if (digits.length < 7) {
    errors.push("Phone number is too short");
  }

  if (digits.length > 15) {
    errors.push("Phone number is too long");
  }

  // Check for country code
  if (requireCountryCode && !digits.startsWith(countryCode)) {
    errors.push(`Phone number must start with country code ${countryCode}`);
  }

  // Check for valid format (basic check)
  const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) {
    errors.push("Phone number format is invalid");
  }

  // Check for repeated digits (suspicious)
  if (/(\d)\1{5,}/.test(digits)) {
    warnings.push("Phone number contains many repeated digits");
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate a date
 * @param date Date to validate (string, Date object, or timestamp)
 * @param options Validation options
 * @returns Validation result
 */
export function validateDate(
  date: string | Date | number,
  options: {
    minDate?: Date;
    maxDate?: Date;
    required?: boolean;
    format?: string;
  } = {}
): ValidationResult {
  const { minDate, maxDate, required = true, format } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  let dateObj: Date;

  if (!date) {
    if (required) {
      errors.push("Date is required");
    }
    return createValidationResult(!required, errors, warnings);
  }

  // Convert to Date object
  if (typeof date === "string") {
    dateObj = new Date(date);

    // If format is specified, validate format
    if (format) {
      const dateRegex = getDateRegexForFormat(format);
      if (dateRegex && !dateRegex.test(date)) {
        errors.push(`Date must be in format: ${format}`);
      }
    }
  } else if (typeof date === "number") {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    errors.push("Date is invalid");
    return createValidationResult(false, errors, warnings);
  }

  // Check min date
  if (minDate && dateObj < minDate) {
    errors.push(`Date must be after ${minDate.toLocaleDateString()}`);
  }

  // Check max date
  if (maxDate && dateObj > maxDate) {
    errors.push(`Date must be before ${maxDate.toLocaleDateString()}`);
  }

  // Check if date is in the future (warning)
  if (dateObj > new Date()) {
    warnings.push("Date is in the future");
  }

  // Check if date is very old (warning)
  const hundredYearsAgo = new Date();
  hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 100);
  if (dateObj < hundredYearsAgo) {
    warnings.push("Date is more than 100 years ago");
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate a number
 * @param num Number to validate (string or number)
 * @param options Validation options
 * @returns Validation result
 */
export function validateNumber(
  num: string | number,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
    required?: boolean;
  } = {}
): ValidationResult {
  const {
    min,
    max,
    integer = false,
    positive = false,
    required = true,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (num === null || num === undefined || num === "") {
    if (required) {
      errors.push("Number is required");
    }
    return createValidationResult(!required, errors, warnings);
  }

  // Convert to number
  const numberValue = typeof num === "string" ? parseFloat(num) : num;

  // Check if it's a valid number
  if (isNaN(numberValue)) {
    errors.push("Value must be a valid number");
    return createValidationResult(false, errors, warnings);
  }

  // Check integer
  if (integer && !Number.isInteger(numberValue)) {
    errors.push("Value must be an integer");
  }

  // Check positive
  if (positive && numberValue <= 0) {
    errors.push("Value must be positive");
  }

  // Check min value
  if (min !== undefined && numberValue < min) {
    errors.push(`Value must be at least ${min}`);
  }

  // Check max value
  if (max !== undefined && numberValue > max) {
    errors.push(`Value must be at most ${max}`);
  }

  // Check for suspiciously large or small numbers
  if (Math.abs(numberValue) > 1e12) {
    warnings.push("Value is very large");
  }

  if (numberValue !== 0 && Math.abs(numberValue) < 1e-12) {
    warnings.push("Value is very small");
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate a file
 * @param file File object or file info
 * @param options Validation options
 * @returns Validation result
 */
export function validateFile(
  file: File | { name: string; size: number; type: string },
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    minSize?: number;
    required?: boolean;
  } = {}
): ValidationResult {
  const {
    allowedTypes = [],
    maxSize = 10 * 1024 * 1024, // 10MB default
    minSize = 0,
    required = true,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!file) {
    if (required) {
      errors.push("File is required");
    }
    return createValidationResult(!required, errors, warnings);
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    errors.push(`File size must be less than ${maxSizeMB} MB`);
  }

  if (file.size < minSize) {
    errors.push(`File size must be at least ${minSize} bytes`);
  }

  // Check file type
  if (allowedTypes.length > 0) {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    let typeValid = false;

    // Check MIME type
    if (
      fileType &&
      allowedTypes.some((type) => fileType.includes(type.toLowerCase()))
    ) {
      typeValid = true;
    }

    // Check file extension as fallback
    if (!typeValid) {
      const extension = fileName.split(".").pop() || "";
      if (allowedTypes.some((type) => type.toLowerCase().includes(extension))) {
        typeValid = true;
      }
    }

    if (!typeValid) {
      errors.push(`File type must be one of: ${allowedTypes.join(", ")}`);
    }
  }

  // Check file name length
  if (file.name.length > 255) {
    warnings.push("File name is very long");
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|sh|bash|ps1|vbs|js)$/i,
    /^\./,
    /[\x00-\x1f\x7f]/,
    /[\/\\:\*\?"<>\|]/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      warnings.push("File name contains potentially unsafe characters");
      break;
    }
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate a credit card number
 * @param cardNumber Credit card number
 * @returns Validation result
 */
export function validateCreditCard(cardNumber: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!cardNumber) {
    errors.push("Credit card number is required");
    return createValidationResult(false, errors, warnings);
  }

  // Remove all non-digit characters
  const digits = cardNumber.replace(/\D/g, "");

  // Check length
  if (digits.length < 13 || digits.length > 19) {
    errors.push("Credit card number must be between 13 and 19 digits");
    return createValidationResult(false, errors, warnings);
  }

  // Luhn algorithm check
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) {
    errors.push("Credit card number is invalid");
  }

  // Check card type
  const cardTypes = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard: /^5[1-5][0-9]{14}$/,
    amex: /^3[47][0-9]{13}$/,
    diners: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
    jcb: /^(?:2131|1800|35\d{3})\d{11}$/,
  };

  let cardType = "Unknown";
  for (const [type, pattern] of Object.entries(cardTypes)) {
    if (pattern.test(digits)) {
      cardType = type.charAt(0).toUpperCase() + type.slice(1);
      break;
    }
  }

  if (cardType === "Unknown") {
    warnings.push("Credit card type could not be determined");
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate an object against a schema
 * @param obj Object to validate
 * @param schema Validation schema
 * @returns Validation result
 */
export function validateObject(
  obj: Record<string, any>,
  schema: Record<string, (value: any) => ValidationResult>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, validator] of Object.entries(schema)) {
    const value = obj[key];
    const result = validator(value);

    if (!result.isValid) {
      errors.push(...result.errors.map((error) => `${key}: ${error}`));
    }

    warnings.push(...result.warnings.map((warning) => `${key}: ${warning}`));
  }

  // Check for extra fields not in schema
  const schemaKeys = new Set(Object.keys(schema));
  const objKeys = new Set(Object.keys(obj));

  for (const key of objKeys) {
    if (!schemaKeys.has(key)) {
      warnings.push(`Unexpected field: ${key}`);
    }
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate a form with multiple fields
 * @param formData Form data object
 * @param validators Validators for each field
 * @returns Validation result with field-specific errors
 */
export function validateForm(
  formData: Record<string, any>,
  validators: Record<string, (value: any) => ValidationResult>
): {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  allErrors: string[];
  allWarnings: string[];
} {
  const errors: Record<string, string[]> = {};
  const warnings: Record<string, string[]> = {};
  let allErrors: string[] = [];
  let allWarnings: string[] = [];

  for (const [field, validator] of Object.entries(validators)) {
    const value = formData[field];
    const result = validator(value);

    errors[field] = result.errors;
    warnings[field] = result.warnings;

    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  const isValid = allErrors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    allErrors,
    allWarnings,
  };
}

// Helper functions

/**
 * Get regex for date format
 */
function getDateRegexForFormat(format: string): RegExp | null {
  const formatRegexes: Record<string, RegExp> = {
    "yyyy-MM-dd": /^\d{4}-\d{2}-\d{2}$/,
    "dd/MM/yyyy": /^\d{2}\/\d{2}\/\d{4}$/,
    "MM/dd/yyyy": /^\d{2}\/\d{2}\/\d{4}$/,
    "yyyy/MM/dd": /^\d{4}\/\d{2}\/\d{2}$/,
    "dd-MM-yyyy": /^\d{2}-\d{2}-\d{4}$/,
    "MM-dd-yyyy": /^\d{2}-\d{2}-\d{4}$/,
  };

  return formatRegexes[format] || null;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Check if a value is not empty
 */
export function isNotEmpty(value: any): boolean {
  return !isEmpty(value);
}

/**
 * Validate required field
 */
export function validateRequired(
  value: any,
  fieldName: string = "Field"
): ValidationResult {
  if (isEmpty(value)) {
    return createValidationResult(false, [`${fieldName} is required`]);
  }
  return createValidationResult(true);
}

/**
 * Validate minimum length
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string = "Field"
): ValidationResult {
  if (!value || value.length < minLength) {
    return createValidationResult(false, [
      `${fieldName} must be at least ${minLength} characters`,
    ]);
  }
  return createValidationResult(true);
}

/**
 * Validate maximum length
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string = "Field"
): ValidationResult {
  if (value && value.length > maxLength) {
    return createValidationResult(false, [
      `${fieldName} must be at most ${maxLength} characters`,
    ]);
  }
  return createValidationResult(true);
}

/**
 * Validate exact length
 */
export function validateExactLength(
  value: string,
  length: number,
  fieldName: string = "Field"
): ValidationResult {
  if (!value || value.length !== length) {
    return createValidationResult(false, [
      `${fieldName} must be exactly ${length} characters`,
    ]);
  }
  return createValidationResult(true);
}

/**
 * Validate pattern match
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  message: string
): ValidationResult {
  if (value && !pattern.test(value)) {
    return createValidationResult(false, [message]);
  }
  return createValidationResult(true);
}

/**
 * Validate equality
 */
export function validateEquals(
  value1: any,
  value2: any,
  message: string
): ValidationResult {
  if (value1 !== value2) {
    return createValidationResult(false, [message]);
  }
  return createValidationResult(true);
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(
  results: ValidationResult[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let isValid = true;

  for (const result of results) {
    if (!result.isValid) {
      isValid = false;
    }
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return createValidationResult(isValid, errors, warnings);
}
