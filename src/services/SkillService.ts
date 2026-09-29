/**
 * SkillService — Reads locally installed skills from ~/.khanhromvn-zen/skills/.
 * Mirrors the webview's listInstalledSkills() behavior for prompt injection.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface InstalledSkill {
  slug: string;
  name: string;
  description?: string;
}

const SKILLS_DIR = path.join(os.homedir(), ".khanhromvn-zen", "skills");

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
        const description = typeof parsed.description === "string" ? parsed.description : undefined;

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