/**
 * SkillService — Local skill storage + remote mcp.directory API client for ZenCLI.
 *
 * Ported from Zen's:
 *   - webview-ui/src/features/marketplace/services/skill.service.ts
 *   - webview-ui/src/features/marketplace/services/skillInstall.service.ts
 *   - handlers/tool/SkillAPIHandler.ts (RSC parsing logic)
 *   - handlers/tool/SkillInstallHandler.ts (disk persistence)
 *
 * Unlike the webview version, this runs directly in Node.js so there is no
 * extension-host bridge or CORS concern — fetch() is called synchronously here.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── Types ──────────────────────────────────────────────────────────────

export interface InstalledSkill {
  slug: string;
  name: string;
  description?: string;
}

export interface SkillSummary {
  id?: number;
  slug: string;
  name: string;
  author?: string;
  description: string;
  sourceUrl?: string;
  category?: string;
  views?: number;
  installs?: number;
}

export interface SkillDetail extends SkillSummary {
  seoDescription?: string;
  content: string;
}

export interface SkillSearchResponse {
  skills: SkillSummary[];
  total?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────

const SKILLS_DIR = path.join(os.homedir(), ".khanhromvn-zen", "skills");
const BASE_URL = "https://mcp.directory";
const REQUEST_TIMEOUT_MS = 15000;

// ─── Disk persistence helpers ───────────────────────────────────────────

function ensureSkillsDir(): void {
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }
}

function slugToFile(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(SKILLS_DIR, `${safe}.json`);
}

// ─── Public: list installed skills ──────────────────────────────────────

/**
 * List all installed skills by reading *.json files in the skills directory.
 * Returns an empty array if the directory does not exist or cannot be read.
 */
export function listInstalledSkills(): InstalledSkill[] {
  try {
    if (!fs.existsSync(SKILLS_DIR)) return [];

    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    const skills: InstalledSkill[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

      const filePath = path.join(SKILLS_DIR, entry.name);
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);

        // Derive slug from filename (strip .json extension)
        const slug = entry.name.replace(/\.json$/, "");
        const name = parsed.name || slug;
        const description =
          typeof parsed.description === "string" ? parsed.description : undefined;

        skills.push({ slug, name, description });
      } catch {
        // Skip malformed individual skill files without failing the whole listing
        continue;
      }
    }

    return skills.filter((s) => !!s.slug);
  } catch {
    return [];
  }
}

/**
 * Build the "Available Skills" section appended to system prompt when
 * skillsEnabled is true. Identical format to the webview PromptBuilder.
 */
export function buildSkillsSection(): string {
  const skills = listInstalledSkills();
  if (skills.length === 0) return "";

  const lines = skills.map((s) => {
    const desc = (s.description || "").replace(/\s+/g, " ").trim();
    const shortDesc = desc.length > 200 ? `${desc.slice(0, 200)}…` : desc;
    const safeSlug = s.slug.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `- **${s.name}**: ${shortDesc} (file: ${SKILLS_DIR}/${safeSlug}.json)`;
  });

  return `\n\n## Available Skills\nInstalled skills you can use. When a task matches a skill's description, read its file for the full instructions before acting.\n${lines.join("\n")}`;
}

// ─── Remote API: search / detail / install ──────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Search skills on mcp.directory by keyword. */
export async function searchSkills(
  query: string,
  limit: number = 24,
  offset: number = 0,
): Promise<SkillSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
  });
  const response = await fetchWithTimeout(`${BASE_URL}/api/v1/skills?${params}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as SkillSearchResponse;
  return data && Array.isArray(data.skills) ? data : { skills: [] };
}

/** Normalize RSC placeholder values ("$undefined"/"$null") to real undefined. */
function normalizeRSCValue(value: any): any {
  if (value === "$undefined" || value === "$null") return undefined;
  return value;
}

/** Extract markdown body of an RSC lazy-reference block by its ref (e.g. "$31"). */
function extractContentByRef(text: string, ref: string): string {
  const refMatch = ref.match(/^\$([0-9a-f]+)$/i);
  if (!refMatch) return "";
  const blockId = refMatch[1];

  const headerRe = new RegExp(
    `(?:^|[^0-9a-f])${blockId}:T[0-9a-f]+,---\\n`,
    "i",
  );
  const headerMatch = text.match(headerRe);
  if (!headerMatch || headerMatch.index === undefined) return "";

  const bodyStart = headerMatch.index + headerMatch[0].length;
  const frontmatterClose = text.indexOf("\n---\n", bodyStart);
  if (frontmatterClose === -1) return "";

  const contentStart = frontmatterClose + 5;
  const remaining = text.substring(contentStart);
  const nextBlock = remaining.match(/\n[0-9a-f]+:[A-Za-z{["$]/i);
  const contentEnd =
    nextBlock && nextBlock.index !== undefined
      ? contentStart + nextBlock.index
      : text.length;

  return text.substring(contentStart, contentEnd).trim();
}

/** Fallback regex parse when structured RSC object extraction fails. */
function parseSkillDetailFallback(text: string): SkillDetail | null {
  try {
    const patterns = [
      /"name":"([^"]+)","author":"[^"]+","description":"((?:[^"\\]|\\.)*)"/,
      /\\"name\\":\\"([^\\]+)\\",\\"author\\":\\"[^\\]+\\",\\"description\\":\\"((?:[^\\"]|\\.)*?)\\/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const name = match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        const description = match[2]
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
          .replace(/\\n/g, "\n");
        return { slug: "", name, description, content: description };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Parse skill detail from RSC payload (ported verbatim from SkillAPIHandler). */
function parseSkillDetailRSC(text: string): SkillDetail | null {
  try {
    const skillMatch = text.match(/"skill":(\{"id":[\s\S]*?\}),"relatedSkills"/);
    if (!skillMatch) return parseSkillDetailFallback(text);

    let skill: any;
    try {
      skill = JSON.parse(skillMatch[1]);
    } catch {
      return parseSkillDetailFallback(text);
    }

    let content = "";
    if (typeof skill.content === "string") {
      content = extractContentByRef(text, skill.content);
    }

    const detail: SkillDetail = {
      id: skill.id,
      slug: skill.slug,
      name: skill.name || skill.slug || "Unknown",
      author: skill.author,
      description: skill.description || "",
      seoDescription: normalizeRSCValue(skill.seoDescription),
      sourceUrl: skill.sourceUrl,
      category: skill.category || undefined,
      views: typeof skill.views === "number" ? skill.views : undefined,
      installs: typeof skill.installs === "number" ? skill.installs : undefined,
      content,
    };

    if (!content) {
      const fallback = parseSkillDetailFallback(text);
      if (fallback?.content) detail.content = fallback.content;
    }

    return detail;
  } catch {
    return parseSkillDetailFallback(text);
  }
}

/** Fetch full detail + markdown content of one skill by slug from mcp.directory. */
export async function fetchSkillDetail(slug: string): Promise<SkillDetail> {
  const response = await fetchWithTimeout(`${BASE_URL}/skills/${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: { rsc: "1" },
  });
  if (!response.ok) {
    throw new Error(`Detail request failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const detail = parseSkillDetailRSC(text);
  if (!detail) {
    throw new Error(`Failed to parse detail for "${slug}"`);
  }
  return detail;
}

/** Persist a fetched skill detail to ~/.khanhromvn-zen/skills/{slug}.json. */
export async function installSkill(skill: SkillDetail | SkillSummary): Promise<void> {
  if (!skill?.slug) {
    throw new Error("installSkill requires a skill with a slug");
  }
  ensureSkillsDir();
  const filePath = slugToFile(skill.slug);
  fs.writeFileSync(filePath, JSON.stringify(skill, null, 2), "utf-8");
}

/** Remove an installed skill file by slug. */
export async function uninstallSkill(slug: string): Promise<void> {
  if (!slug) throw new Error("uninstallSkill requires a slug");
  const filePath = slugToFile(slug);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}