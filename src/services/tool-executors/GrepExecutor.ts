/**
 * GrepExecutor — searches for regex patterns across files.
 * Pure Node.js implementation (no ripgrep dependency).
 */

import * as fs from "fs";
import * as path from "path";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";
import { SecurityValidator } from "../../utils/security";

const MAX_GREP_FILES = 500;
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

interface MatchResult {
  lineNumber: number;
  lineContent: string;
}

interface FileMatchResult {
  matches: MatchResult[];
}

async function collectFiles(dirPath: string, results: string[]): Promise<void> {
  if (results.length >= MAX_GREP_FILES) return;

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= MAX_GREP_FILES) return;
    const name = entry.name;
    if (name === "node_modules" || name === ".git" || name === "dist" || name === "build" || name.startsWith(".")) continue;

    const fullPath = path.join(dirPath, name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath, results);
    } else {
      results.push(fullPath);
    }
  }
}

async function searchInFile(filePath: string, regex: RegExp): Promise<{ matches: MatchResult[]; linesScanned: number }> {
  const matches: MatchResult[] = [];
  let linesScanned = 0;

  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      return { matches, linesScanned };
    }
    const content = await fs.promises.readFile(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    linesScanned = lines.length;

    for (let i = 0; i < lines.length; i++) {
      regex.lastIndex = 0;
      if (regex.test(lines[i])) {
        matches.push({
          lineNumber: i + 1,
          lineContent: lines[i].trim(),
        });
      }
    }
  } catch {
    // Skip binary/unreadable files
  }

  return { matches, linesScanned };
}

function formatGrepResultCompact(
  searchTerm: string,
  results: Record<string, FileMatchResult>,
  totalFilesSearched: number,
  totalMatches: number,
): string {
  const filePaths = Object.keys(results);
  const fileCount = filePaths.length;

  if (totalMatches === 0) {
    return `<grep_results search="${searchTerm}" total_matches="0" files_searched="${totalFilesSearched}" />\n`;
  }

  const lines: string[] = [];
  lines.push(
    `<grep_results search="${searchTerm}" total_matches="${totalMatches}" files="${fileCount}" files_searched="${totalFilesSearched}">`,
  );

  for (const filePath of filePaths) {
    const fileResult = results[filePath];
    const matches = fileResult.matches;
    lines.push(`<file path="${filePath}" matches="${matches.length}">`);

    for (const match of matches) {
      const lineNum = String(match.lineNumber).padStart(5);
      const content =
        match.lineContent.length > 120
          ? match.lineContent.slice(0, 117) + "..."
          : match.lineContent;
      lines.push(`${lineNum}: ${content}`);
    }
    lines.push(`</file>`);
  }

  lines.push(`</grep_results>`);
  return lines.join("\n");
}

export class GrepExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const searchTerm = action.params.search_term || "";
    const filePath = action.params.file_path;
    const folderPath = action.params.folder_path;
    const actionId = action.actionId;
    const targetDesc = filePath || folderPath || "unknown";

    if (!searchTerm.trim()) {
      const errMsg = "Missing search term";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[grep for '${searchTerm}' in '${targetDesc}'] Result: Error - ${errMsg}`;
    }

    if (!filePath && !folderPath) {
      const errMsg = "Either file_path or folder_path must be provided";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[grep] Result: Error - ${errMsg}`;
    }

    if (filePath && folderPath) {
      const errMsg = "Provide only one of file_path or folder_path, not both";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[grep] Result: Error - ${errMsg}`;
    }

    let regex: RegExp;
    try {
      regex = new RegExp(searchTerm, "i");
    } catch (e: any) {
      const errMsg = `Invalid regex pattern: ${searchTerm} - ${e.message}`;
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[grep] Result: Error - ${errMsg}`;
    }

    try {
      let filesToSearch: string[] = [];

      if (filePath) {
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(context.workspacePath, filePath);
        const sec = SecurityValidator.validatePath(resolvedPath, false);
        if (!sec.safe) {
          const errMsg = sec.reason || "Security validation failed";
          setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
          return `[grep] Result: Error - ${errMsg}`;
        }
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        filesToSearch = [resolvedPath];
      } else if (folderPath) {
        const resolvedFolder = path.isAbsolute(folderPath) ? folderPath : path.resolve(context.workspacePath, folderPath);
        const sec = SecurityValidator.validatePath(resolvedFolder, false);
        if (!sec.safe) {
          const errMsg = sec.reason || "Security validation failed";
          setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
          return `[grep] Result: Error - ${errMsg}`;
        }
        if (!fs.existsSync(resolvedFolder)) {
          throw new Error(`Folder not found: ${folderPath}`);
        }
        await collectFiles(resolvedFolder, filesToSearch);
      }

      const results: Record<string, FileMatchResult> = {};
      let totalLinesScanned = 0;

      for (const file of filesToSearch) {
        const { matches, linesScanned } = await searchInFile(file, regex);
        totalLinesScanned += linesScanned;
        if (matches.length > 0) {
          const relPath = path.relative(context.workspacePath, file);
          results[relPath] = { matches };
        }
      }

      const totalMatches = Object.values(results).reduce((sum, r) => sum + r.matches.length, 0);
      const resultText = formatGrepResultCompact(searchTerm, results, filesToSearch.length, totalMatches);

      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: resultText, isError: false } });
      return `[grep for '${searchTerm}' in '${targetDesc}'] Result:\n${resultText}`;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error during grep";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[grep for '${searchTerm}' in '${targetDesc}'] Result: Error - ${errMsg}`;
    }
  }
}