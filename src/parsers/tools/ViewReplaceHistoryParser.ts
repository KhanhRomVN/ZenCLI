/**
 * ------------------------------------------------------------------
 * View Replace History Parser
 * ------------------------------------------------------------------
 * Trích xuất tham số cho lệnh xem lịch sử chỉnh sửa file (`view_replace_history`).
 *
 * Main functions:
 * - parseViewReplaceHistory() : Trả về ViewReplaceHistoryParams chứa đường dẫn file
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── Utils ─
import { extractParamValue } from "../../utils/ToolParser.js";

// ─── Types & Interfaces ────────────────────────────────────────────────
export interface ViewReplaceHistoryParams {
  file_path: string;
}

// ─── Functions ──────────────────────────────────────────────────────────
export const parseViewReplaceHistory = (
  innerContent: string,
): ViewReplaceHistoryParams => {
  const filePath = extractParamValue(innerContent, "file_path") || "";
  return { file_path: filePath };
};
