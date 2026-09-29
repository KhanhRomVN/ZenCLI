/**
 * CliSettingsService — File-based persistence for CLI runtime flags.
 *
 * Mirrors the webview's localStorage approach (useModelPromptSettings +
 * useToggleState) but uses a JSON file at ~/.khanhromvn-zen/cli-settings.json
 * because Node.js has no built-in localStorage.
 *
 * All reads/writes are synchronous fs calls guarded by try/catch so that a
 * corrupt or missing file never crashes the app — it simply falls back to
 * defaults.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const SETTINGS_FILE = path.join(os.homedir(), ".khanhromvn-zen", "cli-settings.json");

export interface CliSettings {
  promptLength: "none" | "short" | "medium" | "long";
  codeStyle: "standard" | "functional" | "oop";
  diagnosticsEnabled: boolean;
  skillsEnabled: boolean;
}

const DEFAULTS: CliSettings = {
  promptLength: "medium",
  codeStyle: "standard",
  diagnosticsEnabled: false,
  skillsEnabled: true,
};

// Whitelists used to reject stale/garbage values from an old config file
const VALID_PROMPT_LENGTHS = ["none", "short", "medium", "long"] as const;
const VALID_CODE_STYLES = ["standard", "functional", "oop"] as const;

function isValidString<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/** Load persisted settings, merging with defaults for any missing/invalid fields. */
export function loadCliSettings(): CliSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULTS };

    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CliSettings>;

    return {
      promptLength: isValidString(parsed.promptLength, VALID_PROMPT_LENGTHS)
        ? parsed.promptLength
        : DEFAULTS.promptLength,
      codeStyle: isValidString(parsed.codeStyle, VALID_CODE_STYLES)
        ? parsed.codeStyle
        : DEFAULTS.codeStyle,
      diagnosticsEnabled:
        typeof parsed.diagnosticsEnabled === "boolean"
          ? parsed.diagnosticsEnabled
          : DEFAULTS.diagnosticsEnabled,
      skillsEnabled:
        typeof parsed.skillsEnabled === "boolean"
          ? parsed.skillsEnabled
          : DEFAULTS.skillsEnabled,
    };
  } catch {
    // Missing dir / unreadable file / malformed JSON → silent fallback
    return { ...DEFAULTS };
  }
}

/** Persist current settings synchronously. Best-effort: failures are swallowed. */
export function saveCliSettings(settings: CliSettings): void {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch {
    // Disk full / permission denied → ignore, in-memory state still works
  }
}