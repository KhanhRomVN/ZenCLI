/**
 * CommitMessageExecutor — generates a commit message from the current git diff.
 * In CLI mode this is display-only (no auto-commit); returns the staged diff summary
 * so the LLM can craft its own message in the next turn.
 */

import { spawn } from "child_process";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";

export class CommitMessageExecutor implements ToolExecutor {
  async execute(
    _action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    try {
      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
        const child = spawn("git", ["diff", "--cached"], {
          cwd: context.workspacePath,
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (c: Buffer) => (stdout += c.toString()));
        child.stderr.on("data", (c: Buffer) => (stderr += c.toString()));
        child.on("error", reject);
        child.on("close", (code) => resolve({ stdout, stderr, exitCode: code ?? 0 }));
      });

      if (result.exitCode !== 0) {
        return `[commit_message] Result: Error - ${result.stderr.trim() || `git exited with code ${result.exitCode}`}`;
      }

      const diffContent = result.stdout.trim();
      if (!diffContent) {
        return "[commit_message] Result: No staged changes found. Use 'git add' first.";
      }

      // Truncate very large diffs to avoid blowing token budget
      const MAX_DIFF_CHARS = 8000;
      const truncated = diffContent.length > MAX_DIFF_CHARS
        ? diffContent.slice(0, MAX_DIFF_CHARS) + "\n... [truncated]"
        : diffContent;

      return `[commit_message] Staged diff:\n\`\`\`diff\n${truncated}\n\`\`\``;
    } catch (e: any) {
      return `[commit_message] Result: Error - ${e.message || "Unknown error"}`;
    }
  }
}