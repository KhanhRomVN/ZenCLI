/**
 * GitDiffExecutor — runs `git diff` (optionally scoped to a file).
 */

import { spawn } from "child_process";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";

export class GitDiffExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const filePath = action.params.file_path || action.params.path;
    const actionId = action.actionId;

    const args = ["diff"];
    if (filePath) args.push("--", filePath);

    try {
      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
        const child = spawn("git", args, {
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
        const errMsg = result.stderr.trim() || `git exited with code ${result.exitCode}`;
        setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
        return `[git_diff for '${filePath || "."}'] Result: Error - ${errMsg}`;
      }

      // Clean metadata lines that are noise for the AI
      const cleanLines = result.stdout.split("\n").filter((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("diff ")) return false;
        if (trimmed.startsWith("index ")) return false;
        if (trimmed.startsWith("new file mode")) return false;
        if (trimmed.startsWith("deleted file mode")) return false;
        if (trimmed.includes("No newline at end of file")) return false;
        return true;
      });
      const diffContent = cleanLines.join("\n");
      const label = filePath ? `'${filePath}'` : "(all changes)";

      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: diffContent, isError: false } });
      return `[git_diff for ${label}] Result:\n\`\`\`diff\n${diffContent}\n\`\`\``;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error running git diff";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[git_diff] Result: Error - ${errMsg}`;
    }
  }
}