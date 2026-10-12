/**
 * ------------------------------------------------------------------
 * Git Status Parser
 * ------------------------------------------------------------------
 * Trích xuất tham số cho lệnh kiểm tra trạng thái Git (`git_status`).
 * Hỗ trợ cả dạng danh sách object đã parse lẫn chuỗi JSON thô.
 *
 * Main functions:
 * - parseGitStatus() : Chuyển đổi nội dung XML tag thành cấu trúc dữ liệu có thể dùng được
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ─
import { extractParamValue } from "../../utils/ToolParser.js";

// ─── Types & Interfaces ────────────────────────────────────────────────
export interface GitStatusItem {
  status: string;
  path: string;
  staged?: boolean;
  added?: number;
  deleted?: number;
  isUnpushedCommit?: boolean;
}

export interface GitStatusParams {
  items?: GitStatusItem[] | string;
  branch?: string;
  raw?: string;
}

// ─── Functions ──────────────────────────────────────────────────────────
export const parseGitStatus = (innerContent: string): GitStatusParams => {
  const items = extractParamValue(innerContent, "items");
  const branch = extractParamValue(innerContent, "branch") || undefined;
  const raw = extractParamValue(innerContent, "raw") || undefined;

  let parsedItems: GitStatusItem[] | string | undefined;
  if (items) {
    try {
      parsedItems = JSON.parse(items);
    } catch {
      parsedItems = items;
    }
  }

  return { items: parsedItems, branch, raw };
};
