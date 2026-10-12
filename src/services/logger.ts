/**
 * ------------------------------------------------------------------
 * File Logger — Centralized logging for ZenCLI
 * ------------------------------------------------------------------
 * Writes timestamped messages to `log.log` in the current working directory.
 * Use this instead of importing logToFile from api.ts directly.
 * ------------------------------------------------------------------
 */

import * as fs from "fs";
import * as path from "path";

const LOG_FILE = path.join(process.cwd(), "log.log");

export function logToFile(message: string): void {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`, "utf-8");
  } catch {
    // Silently ignore logging errors to avoid disrupting the app
  }
}