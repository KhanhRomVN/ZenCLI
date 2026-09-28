/**
 * Decode common HTML entities back to their original characters.
 * Pure Node.js implementation — no DOM dependency.
 */
const decodeHtmlEntities = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/&/g, "&"); // & decode last to avoid double unescaping
};

export { decodeHtmlEntities };