/**
 * ------------------------------------------------------------------
 * Markdown Parser
 * ------------------------------------------------------------------
 * Bộ xử lý đơn giản cho khối nội dung Markdown.
 * Hiện tại chỉ làm nhiệm vụ cắt bỏ khoảng trắng thừa ở hai đầu.
 *
 * Main functions:
 * - parseMarkdown() : Trả về chuỗi văn bản sạch
 * ------------------------------------------------------------------
 */

// ─── Functions ─────────────────────────────────────────────────────────
export const parseMarkdown = (innerContent: string): string => {
  if (!innerContent) return "";
  return innerContent.trim();
};