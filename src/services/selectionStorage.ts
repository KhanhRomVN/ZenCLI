import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { logToFile } from "./logger.js";

export interface SavedSelection {
  providerId: string;
  modelId: string;
  accountId?: string;
  email?: string;
}

const SELECTIONS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || "/tmp",
  ".zen-cli",
  "selections",
);

function hashCwd(cwd: string): string {
  return crypto.createHash("sha256").update(cwd).digest("hex").slice(0, 16);
}

function getFilePath(cwd: string): string {
  return path.join(SELECTIONS_DIR, `${hashCwd(cwd)}.json`);
}

/**
 * Lưu selection cho project hiện tại.
 * Tạo thư mục nếu chưa tồn tại.
 */
export function saveSelection(selection: SavedSelection): void {
  try {
    fs.mkdirSync(SELECTIONS_DIR, { recursive: true });
    const filePath = getFilePath(process.cwd());
    fs.writeFileSync(filePath, JSON.stringify(selection, null, 2), "utf-8");
  } catch (err) {
    // Silent fail — không block UX nếu không ghi được file
    console.error("[selectionStorage] save error:", err);
  }
}

/**
 * Đọc selection đã lưu cho CWD hiện tại.
 * Trả về null nếu chưa có hoặc lỗi.
 */
export function loadSelection(): SavedSelection | null {
  try {
    const cwd = process.cwd();
    const filePath = getFilePath(cwd);
    const hash = hashCwd(cwd);
    // [DEBUG] Log selection loading details to file instead of terminal
    logToFile(`[DEBUG][selectionStorage.loadSelection] cwd=${cwd}`);
    logToFile(`[DEBUG][selectionStorage.loadSelection] hash=${hash}, filePath=${filePath}`);
    logToFile(`[DEBUG][selectionStorage.loadSelection] exists=${fs.existsSync(filePath)}`);
    
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    logToFile(`[DEBUG][selectionStorage.loadSelection] fileContent=${raw}`);
    
    const parsed = JSON.parse(raw) as SavedSelection;
    if (!parsed.providerId || !parsed.modelId) {
      logToFile(`[DEBUG][selectionStorage.loadSelection] INVALID: missing providerId or modelId`);
      return null;
    }
    logToFile(`[DEBUG][selectionStorage.loadSelection] SUCCESS: loaded ${JSON.stringify(parsed)}`);
    return parsed;
  } catch (err) {
    logToFile(`[DEBUG][selectionStorage.loadSelection] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}