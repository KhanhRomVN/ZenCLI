/**
 * ------------------------------------------------------------------
 * HTML Entities Decoder
 * ------------------------------------------------------------------
 * Công cụ giải mã các ký tự HTML entity (<, >, &...) về dạng thô.
 * Được sử dụng khi parse nội dung XML từ LLM để tránh lỗi escaping.
 *
 * Main functions:
 * - decodeHtmlEntities() : Chuyển đổi chuỗi có chứa entity thành văn bản thuần
 * ------------------------------------------------------------------
 */

// ─── Functions ──────────────────────────────────────────────────────────
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