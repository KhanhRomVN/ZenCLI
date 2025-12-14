/**
 * String utilities for ZenCLI
 */

/**
 * Capitalize the first letter of a string
 * @param str Input string
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalize the first letter of each word in a string
 * @param str Input string
 * @returns Title-cased string
 */
export function titleCase(str: string): string {
  if (!str) return str;
  return str
    .split(/\s+/)
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Convert a string to camelCase
 * @param str Input string
 * @returns camelCase string
 */
export function camelCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return capitalize(word);
    })
    .join("");
}

/**
 * Convert a string to PascalCase
 * @param str Input string
 * @returns PascalCase string
 */
export function pascalCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .map((word) => capitalize(word))
    .join("");
}

/**
 * Convert a string to kebab-case
 * @param str Input string
 * @returns kebab-case string
 */
export function kebabCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

/**
 * Convert a string to snake_case
 * @param str Input string
 * @returns snake_case string
 */
export function snakeCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase()
    .replace(/^_+|_+$/g, "");
}

/**
 * Truncate a string to a specified length
 * @param str Input string
 * @param maxLength Maximum length
 * @param suffix Suffix to add if truncated (default: "...")
 * @returns Truncated string
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix = "..."
): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Truncate a string in the middle
 * @param str Input string
 * @param maxLength Maximum length
 * @param separator Separator to use in middle (default: "...")
 * @returns Truncated string
 */
export function truncateMiddle(
  str: string,
  maxLength: number,
  separator = "..."
): string {
  if (!str || str.length <= maxLength) return str;

  const charsToShow = maxLength - separator.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return (
    str.substring(0, frontChars) +
    separator +
    str.substring(str.length - backChars)
  );
}

/**
 * Remove diacritics (accents) from a string
 * @param str Input string
 * @returns String without diacritics
 */
export function removeDiacritics(str: string): string {
  if (!str) return str;
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Slugify a string for URLs
 * @param str Input string
 * @returns Slugified string
 */
export function slugify(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a random string
 * @param length Length of string
 * @param charset Character set to use
 * @returns Random string
 */
export function randomString(
  length: number = 16,
  charset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
): string {
  let result = "";
  const charsetLength = charset.length;

  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charsetLength));
  }

  return result;
}

/**
 * Generate a random hex color
 * @returns Hex color string
 */
export function randomHexColor(): string {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
}

/**
 * Check if a string is a valid email address
 * @param email Email to validate
 * @returns True if valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a string is a valid URL
 * @param url URL to validate
 * @returns True if valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid IP address
 * @param ip IP address to validate
 * @returns True if valid IP
 */
export function isValidIp(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Check if a string contains only numbers
 * @param str String to check
 * @returns True if only numbers
 */
export function isNumeric(str: string): boolean {
  if (!str) return false;
  return /^\d+$/.test(str);
}

/**
 * Check if a string contains only letters
 * @param str String to check
 * @returns True if only letters
 */
export function isAlpha(str: string): boolean {
  if (!str) return false;
  return /^[A-Za-z]+$/.test(str);
}

/**
 * Check if a string contains only letters and numbers
 * @param str String to check
 * @returns True if only letters and numbers
 */
export function isAlphaNumeric(str: string): boolean {
  if (!str) return false;
  return /^[A-Za-z0-9]+$/.test(str);
}

/**
 * Mask a string (e.g., for credit cards, emails)
 * @param str String to mask
 * @param options Masking options
 * @returns Masked string
 */
export function maskString(
  str: string,
  options: {
    type?: "email" | "phone" | "credit-card" | "ssn" | "custom";
    visibleStart?: number;
    visibleEnd?: number;
    maskChar?: string;
  } = {}
): string {
  if (!str) return str;

  const { type, visibleStart = 2, visibleEnd = 2, maskChar = "*" } = options;

  switch (type) {
    case "email":
      const [local, domain] = str.split("@");
      if (!domain) return str;
      return (
        local.charAt(0) +
        maskChar.repeat(Math.max(0, local.length - 2)) +
        local.charAt(local.length - 1) +
        "@" +
        domain
      );

    case "phone":
      const digits = str.replace(/\D/g, "");
      if (digits.length <= 4) return maskChar.repeat(digits.length);
      return (
        digits.substring(0, visibleStart) +
        maskChar.repeat(digits.length - visibleStart - visibleEnd) +
        digits.substring(digits.length - visibleEnd)
      );

    case "credit-card":
      if (str.length <= 4) return maskChar.repeat(str.length);
      return (
        str.substring(0, visibleStart) +
        maskChar.repeat(str.length - visibleStart - visibleEnd) +
        str.substring(str.length - visibleEnd)
      );

    case "ssn":
      if (str.length <= 4) return maskChar.repeat(str.length);
      return maskChar.repeat(str.length - 4) + str.substring(str.length - 4);

    case "custom":
    default:
      if (str.length <= visibleStart + visibleEnd) {
        return maskChar.repeat(str.length);
      }
      return (
        str.substring(0, visibleStart) +
        maskChar.repeat(str.length - visibleStart - visibleEnd) +
        str.substring(str.length - visibleEnd)
      );
  }
}

/**
 * Format a number with commas as thousands separator
 * @param num Number to format
 * @returns Formatted string
 */
export function formatNumberWithCommas(num: number | string): string {
  const str = typeof num === "number" ? num.toString() : num;
  const parts = str.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/**
 * Convert bytes to human readable format
 * @param bytes Number of bytes
 * @param decimals Number of decimal places
 * @returns Human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Convert a string to a safe filename
 * @param filename Original filename
 * @returns Safe filename
 */
export function safeFilename(filename: string): string {
  if (!filename) return filename;
  return filename
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 255);
}

/**
 * Extract domain from URL
 * @param url URL to extract domain from
 * @returns Domain or empty string
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "";
  }
}

/**
 * Extract file extension from filename
 * @param filename Filename
 * @returns File extension or empty string
 */
export function getFileExtension(filename: string): string {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Remove file extension from filename
 * @param filename Filename
 * @returns Filename without extension
 */
export function removeFileExtension(filename: string): string {
  if (!filename) return filename;
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex === -1 ? filename : filename.substring(0, lastDotIndex);
}

/**
 * Escape HTML special characters
 * @param str String to escape
 * @returns Escaped string
 */
export function escapeHtml(str: string): string {
  if (!str) return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Unescape HTML special characters
 * @param str String to unescape
 * @returns Unescaped string
 */
export function unescapeHtml(str: string): string {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

/**
 * Count words in a string
 * @param str String to count words in
 * @returns Word count
 */
export function wordCount(str: string): number {
  if (!str) return 0;
  return str.trim().split(/\s+/).length;
}

/**
 * Count characters in a string (excluding spaces)
 * @param str String to count characters in
 * @returns Character count
 */
export function charCount(str: string, excludeSpaces: boolean = false): number {
  if (!str) return 0;
  if (excludeSpaces) {
    return str.replace(/\s/g, "").length;
  }
  return str.length;
}

/**
 * Generate initials from a name
 * @param name Full name
 * @returns Initials
 */
export function getInitials(name: string): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .substring(0, 2);
}

/**
 * Generate a hash code from a string
 * @param str Input string
 * @returns Hash code
 */
export function hashCode(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash;
}

/**
 * Generate a simple hash string from a string
 * @param str Input string
 * @param length Length of hash (default: 8)
 * @returns Hash string
 */
export function simpleHash(str: string, length: number = 8): string {
  const hash = hashCode(str).toString(36).replace("-", "0");
  return hash.substring(0, length).padEnd(length, "0");
}

/**
 * Check if a string starts with a prefix (case insensitive)
 * @param str String to check
 * @param prefix Prefix to check for
 * @returns True if string starts with prefix
 */
export function startsWithIgnoreCase(str: string, prefix: string): boolean {
  if (!str || !prefix) return false;
  return str.toLowerCase().startsWith(prefix.toLowerCase());
}

/**
 * Check if a string ends with a suffix (case insensitive)
 * @param str String to check
 * @param suffix Suffix to check for
 * @returns True if string ends with suffix
 */
export function endsWithIgnoreCase(str: string, suffix: string): boolean {
  if (!str || !suffix) return false;
  return str.toLowerCase().endsWith(suffix.toLowerCase());
}

/**
 * Check if a string contains a substring (case insensitive)
 * @param str String to search in
 * @param substring Substring to search for
 * @returns True if string contains substring
 */
export function containsIgnoreCase(str: string, substring: string): boolean {
  if (!str || !substring) return false;
  return str.toLowerCase().includes(substring.toLowerCase());
}

/**
 * Normalize line endings to LF
 * @param str String to normalize
 * @returns Normalized string
 */
export function normalizeLineEndings(str: string): string {
  if (!str) return str;
  return str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Remove duplicate lines from a string
 * @param str String with possible duplicate lines
 * @returns String without duplicate lines
 */
export function removeDuplicateLines(str: string): string {
  if (!str) return str;
  const lines = str.split("\n");
  const uniqueLines = [...new Set(lines)];
  return uniqueLines.join("\n");
}

/**
 * Split a string into lines, handling different line endings
 * @param str String to split
 * @returns Array of lines
 */
export function splitLines(str: string): string[] {
  if (!str) return [];
  return normalizeLineEndings(str).split("\n");
}

/**
 * Join an array of lines into a string with line endings
 * @param lines Array of lines
 * @param lineEnding Line ending to use (default: "\n")
 * @returns Joined string
 */
export function joinLines(lines: string[], lineEnding: string = "\n"): string {
  if (!lines) return "";
  return lines.join(lineEnding);
}

/**
 * Pad a string to a certain length
 * @param str String to pad
 * @param length Target length
 * @param char Padding character (default: " ")
 * @param direction Padding direction ("left", "right", "both") (default: "right")
 * @returns Padded string
 */
export function padString(
  str: string,
  length: number,
  char: string = " ",
  direction: "left" | "right" | "both" = "right"
): string {
  if (!str) str = "";
  const padding = char.repeat(Math.max(0, length - str.length));

  switch (direction) {
    case "left":
      return padding + str;
    case "both":
      const leftPadding = padding.substring(0, Math.floor(padding.length / 2));
      const rightPadding = padding.substring(Math.floor(padding.length / 2));
      return leftPadding + str + rightPadding;
    case "right":
    default:
      return str + padding;
  }
}

/**
 * Convert a string to base64
 * @param str String to encode
 * @returns Base64 encoded string
 */
export function toBase64(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8").toString("base64");
  }

  // Fallback for browsers
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(str)));
  }

  throw new Error("Base64 encoding not supported in this environment");
}

/**
 * Convert base64 to string
 * @param base64 Base64 string to decode
 * @returns Decoded string
 */
export function fromBase64(base64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf8");
  }

  // Fallback for browsers
  if (typeof atob !== "undefined") {
    return decodeURIComponent(escape(atob(base64)));
  }

  throw new Error("Base64 decoding not supported in this environment");
}

/**
 * Create a UUID v4
 * @returns UUID string
 */
export function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short ID
 * @param length Length of ID (default: 8)
 * @returns Short ID
 */
export function shortId(length: number = 8): string {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
