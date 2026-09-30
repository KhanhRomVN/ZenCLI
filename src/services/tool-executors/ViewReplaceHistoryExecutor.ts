/**
 * ViewReplaceHistoryExecutor — shows commit history of a file via git.
 *
 * ZenCLI lacks the ReplaceInFileHistoryManager used by the VSCode extension to
 * track every individual edit made during a session. As a practical substitute,
 * this executor runs `git log --oneline` scoped to the target path so the AI can
 * still inspect how the file evolved across commits.
 */

import { execFile } from "child_process";
import * as path from "path";
import { promisify } from "util";
import {
  ExecutorContext,
  ExecutorOptions,
  ToolExecutor,
} from "../../types/executor-types";
import { SecurityValidator } from "../../utils/security";

const execFileAsync = promisify(execFile);

export class ViewReplaceHistoryExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs, workspacePath } = context;
    const filePath = action.params.path || action.params.file_path;
    const actionId = action.actionId;

    if (!filePath) {
      const errMsg = "Missing 'path' parameter";
      setToolOutputs((prev) => ({
        ...prev,
        [actionId]: { output: `Error - ${errMsg}`, isError: true },
      }));
      return `[view_replace_history] Result: Error - ${errMsg}`;
    }

    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(workspacePath, filePath);

    const sec = SecurityValidator.validatePath(resolvedPath, false);
    if (!sec.safe) {
      const errMsg = sec.reason || "Security validation failed";
      setToolOutputs((prev) => ({
        ...prev,
        [actionId]: { output: `Error - ${errMsg}`, isError: true },
      }));
      return `[view_replace_history for '${filePath}'] Result: Error - ${errMsg}`;
    }

    try {
      // Resolve repo-relative path for accurate scoping
      let relPath = resolvedPath;
      const { stdout: repoRootOut } = await execFileAsync("git", [
        "rev-parse",
        "--show-toplevel",
      ], { cwd: path.dirname(resolvedPath) });
      const repoRoot = repoRootOut.trim();
      relPath = path.relative(repoRoot, resolvedPath);

      const { stdout } = await execFileAsync(
        "git",
        ["log", "--oneline", "-n", "20", "--", relPath],
        { cwd: repoRoot },
      );

      const lines = stdout.trim().split("\n").filter(Boolean);

      if (lines.length === 0) {
        const result = `[view_replace_history for '${filePath}'] Result: No git commit history found for this file.`;
        setToolOutputs((prev) => ({
          ...prev,
          [actionId]: { output: "No history", isError: false },
        }));
        return result;
      }

      let output = `[view_replace_history for '${filePath}'] Found ${lines.length} commit(s):\n\n`;
      output += lines.map((l) => `- ${l}`).join("\n");

      setToolOutputs((prev) => ({
        ...prev,
        [actionId]: { output: JSON.stringify(lines), isError: false },
      }));

      return output;
    } catch (e: any) {
      const stderr = (e.stderr || e.message || "").toString().trim();
      const errMsg = stderr
        ? `git log failed: ${stderr}`
        : "Could not read file history — ensure it is inside a git repository.";
      setToolOutputs((prev) => ({
        ...prev,
        [actionId]: { output: `Error - ${errMsg}`, isError: true },
      }));
      return `[view_replace_history for '${filePath}'] Result: Error - ${errMsg}`;
    }
  }
}