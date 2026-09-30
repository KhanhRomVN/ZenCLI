/**
 * ListFilesExecutor — lists directory tree with depth control.
 * Pure Node.js implementation respecting .gitignore-like exclusions.
 */

import * as fs from "fs";
import * as path from "path";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";
import { SecurityValidator } from "../../utils/security";

const MAX_LINE_COUNT_FILE_SIZE = 1024 * 1024; // 1 MB

const TEXT_FILE_EXTENSIONS = new Set<string>([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".markdown",
  ".txt", ".css", ".scss", ".sass", ".less", ".html", ".htm", ".xml", ".svg",
  ".py", ".go", ".rs", ".java", ".kt", ".kts", ".swift", ".c", ".h", ".cpp",
  ".cc", ".cxx", ".hpp", ".rb", ".php", ".cs", ".dart", ".lua", ".yml", ".yaml",
  ".toml", ".ini", ".conf", ".env", ".sh", ".bash", ".zsh", ".fish", ".ps1",
  ".bat", ".cmd", ".log", ".vue", ".svelte", ".astro", ".sql", ".graphql",
  ".gql", ".proto",
]);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatLines(count: number): string {
  return `${count} ${count === 1 ? "line" : "lines"}`;
}

interface TreeNode {
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
  size?: number;
  lines?: number;
}

async function countFileLines(filePath: string): Promise<number | undefined> {
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.size > MAX_LINE_COUNT_FILE_SIZE) return undefined;
    const ext = path.extname(filePath).toLowerCase();
    if (!TEXT_FILE_EXTENSIONS.has(ext)) return undefined;
    const content = await fs.promises.readFile(filePath, "utf-8");
    if (content.length === 0) return 0;
    const nlCount = (content.match(/\n/g) || []).length;
    return content.endsWith("\n") ? nlCount : nlCount + 1;
  } catch {
    return undefined;
  }
}

async function buildTree(dirPath: string, currentDepth: number, maxDepth: number): Promise<TreeNode[]> {
  if (currentDepth > maxDepth) return [];

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  entries.sort((a, b) => {
    const aIsDir = a.isDirectory() ? 0 : 1;
    const bIsDir = b.isDirectory() ? 0 : 1;
    if (aIsDir !== bIsDir) return aIsDir - bIsDir;
    return a.name.localeCompare(b.name);
  });

  const results: TreeNode[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const children = await buildTree(entryPath, currentDepth + 1, maxDepth);
      results.push({ name: entry.name, type: "folder", children });
    } else {
      let size: number | undefined;
      try {
        const stat = await fs.promises.stat(entryPath);
        size = stat.size;
      } catch {
        size = undefined;
      }
      const lines = await countFileLines(entryPath);
      results.push({ name: entry.name, type: "file", size, lines });
    }
  }
  return results;
}

function countFilesRecursive(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "file") count += 1;
    else if (node.children && node.children.length > 0) count += countFilesRecursive(node.children);
  }
  return count;
}

function formatTree(nodes: TreeNode[], indent: string = ""): string {
  let result = "";
  for (const node of nodes) {
    if (node.type === "folder") {
      result += `${indent}${node.name}/`;
      if (node.children && node.children.length > 0) {
        const total = countFilesRecursive(node.children);
        result += ` (${total} ${total === 1 ? "file" : "files"} total)`;
      }
      result += "\n";
      if (node.children && node.children.length > 0) {
        result += formatTree(node.children, indent + "  ");
      }
    } else {
      result += `${indent}${node.name}`;
      if (node.lines !== undefined) {
        result += ` (${formatLines(node.lines)})`;
      } else if (node.size !== undefined) {
        result += ` (${formatSize(node.size)})`;
      }
      result += "\n";
    }
  }
  return result;
}

export class ListFilesExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const folderPath = action.params.folder_path || action.params.path || ".";
    const actionId = action.actionId;

    const resolvedPath = path.isAbsolute(folderPath) ? folderPath : path.resolve(context.workspacePath, folderPath);

    const sec = SecurityValidator.validatePath(resolvedPath, false);
    if (!sec.safe) {
      const errMsg = sec.reason || "Security validation failed";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[list_files for '${folderPath}'] Result: Error - ${errMsg}`;
    }

    try {
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Folder not found: ${folderPath}`);
      }
      const stat = await fs.promises.stat(resolvedPath);
      if (!stat.isDirectory()) {
        throw new Error(`Not a directory: ${folderPath}`);
      }

      let maxDepth = 1;
      if (action.params.depth !== undefined && action.params.depth !== null) {
        if (String(action.params.depth).toLowerCase() === "max") {
          maxDepth = 999;
        } else {
          maxDepth = parseInt(String(action.params.depth), 10) || 1;
        }
      }

      const tree = await buildTree(resolvedPath, 1, maxDepth);

      if (tree.length === 0) {
        const msg = `The folder '${folderPath}' is empty (no files or folders inside).`;
        setToolOutputs({ ...context.toolOutputs, [actionId]: { output: msg, isError: false } });
        return `[list_files for '${folderPath}'] Result: ${msg}`;
      }

      const formattedOutput = formatTree(tree);
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: JSON.stringify(tree), isError: false } });
      return `[list_files for '${folderPath}'] Result:\n${formattedOutput}`;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error listing files";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[list_files for '${folderPath}'] Result: Error - ${errMsg}`;
    }
  }
}