/**
 * FindFilesExecutor — finds files by name/glob pattern in the workspace.
 * Pure Node.js implementation using recursive directory walk.
 */

import * as fs from "fs";
import * as path from "path";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";
import { SecurityValidator } from "../../utils/security";

const MAX_RESULTS = 100;

function matchesGlob(fileName: string, pattern: string): boolean {
  // Simple glob matching: supports *, **, and exact names
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{DOUBLESTAR}}/g, ".*");
  try {
    return new RegExp(`^${regexStr}$`, "i").test(fileName);
  } catch {
    return fileName.toLowerCase().includes(pattern.replace(/[*]/g, "").toLowerCase());
  }
}

async function findFilesRecursive(
  dirPath: string,
  pattern: string,
  results: string[],
): Promise<void> {
  if (results.length >= MAX_RESULTS) return;

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= MAX_RESULTS) return;
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await findFilesRecursive(fullPath, pattern, results);
    } else if (matchesGlob(entry.name, pattern)) {
      results.push(fullPath);
    }
  }
}

export class FindFilesExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const fileName = action.params.file_name || "";
    const folderPath = action.params.folder_path;
    const actionId = action.actionId;

    if (!fileName) {
      const errMsg = "Missing 'file_name' parameter";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[find_files] Result: Error - ${errMsg}`;
    }

    const searchRoot = folderPath
      ? (path.isAbsolute(folderPath) ? folderPath : path.resolve(context.workspacePath, folderPath))
      : context.workspacePath;

    const sec = SecurityValidator.validatePath(searchRoot, false);
    if (!sec.safe) {
      const errMsg = sec.reason || "Security validation failed";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[find_files] Result: Error - ${errMsg}`;
    }

    try {
      if (!fs.existsSync(searchRoot)) {
        throw new Error(`Search root not found: ${searchRoot}`);
      }

      const results: string[] = [];
      await findFilesRecursive(searchRoot, fileName, results);

      const relativePaths = results.map((r) => path.relative(context.workspacePath, r));
      const scope = folderPath ? `in folder "${folderPath}"` : "in entire workspace";

      let output = `[find_files] Searching for "${fileName}" ${scope}\n`;
      output += `Found ${relativePaths.length} file(s)\n\n`;

      if (relativePaths.length === 0) {
        output += "No files found matching the search criteria.";
      } else {
        for (const rp of relativePaths) {
          output += `- ${rp}\n`;
        }
      }

      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: JSON.stringify(relativePaths), isError: false } });
      return output;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error finding files";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[find_files] Result: Error - ${errMsg}`;
    }
  }
}