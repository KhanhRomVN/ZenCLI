/**
 * RevertFileExecutor — reverts a file to its last committed state via git.
 *
 * ZenCLI does not yet have the CheckpointManager / ReplaceInFileHistoryManager
 * that powers granular per-edit rollback in the VSCode extension. As a pragmatic
 * fallback, this executor shells out to `git checkout HEAD -- <path>` which
 * restores the file to the most recent commit on the current branch.
 *
 * If the path is outside a git repository or has no tracked version, an error
 * string is returned so the AI learns the operation failed and can adapt.
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

export class RevertFileExecutor implements ToolExecutor {
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
      return `[revert_file] Result: Error - ${errMsg}`;
    }

    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(workspacePath, filePath);

    // Security check — never allow escaping the workspace root
    const sec = SecurityValidator.validatePath(resolvedPath, false);
    if (!sec.safe) {
      const errMsg = sec.reason || "Security validation failed";
      setToolOutputs((prev) => ({
        ...prev,
        [actionId]: { output: `Error - ${errMsg}`, isError: true },
      }));
      return `[revert_file for '${filePath}'] Result: Error - ${errMsg}`;
    }

    try {
      // Compute path relative to repo root so git accepts it regardless of CWD.
      let relPath = resolvedPath;
      try {
        const { stdout: repoRootOut } = await execFileAsync("git", [
          "rev-parse",
          "--show-toplevel",
        ], { cwd: path.dirname(resolvedPath) });
        const repoRoot = repoRootOut.trim();
        relPath = path.relative(repoRoot, resolvedPath);
      } catch {
        // Not inside a git repo — fall through to error below
      }

      await execFileAsync("git", ["checkout", "HEAD", "--", relPath], {
        cwd: path.dirname(resolvedPath),
      });

      const result = `[revert_file for '${filePath}'] Result: File reverted to last committed version (via git).`;
      setToolOutputs((prev) => ({
        ...prev,
        [actionId]: { output: "Reverted via git", isError: false },
      }));
      return result;
    } catch (e: any) {
      const stderr = (e.stderr || e.message || "").toString().trim();
      const errMsg = stderr
        ? `git revert failed: ${stderr}`
        : "Could not revert file — ensure it is tracked by git.";
      setToolOutputs((prev) => ({
        ...prev,
        [actionId]: { output: `Error - ${errMsg}`, isError: true },
      }));
      return `[revert_file for '${filePath}'] Result: Error - ${errMsg}`;
    }
  }
}