/**
 * GitStatusExecutor — runs `git status --porcelain=v1` in the workspace.
 */

import { spawn } from "child_process";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";

export class GitStatusExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const actionId = action.actionId;

    try {
      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
        const child = spawn("git", ["status", "--porcelain=v1"], {
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
        return `[git_status] Result: Error - ${errMsg}`;
      }

      const lines = result.stdout.split("\n").filter((l) => l.length > 0);
      const output = lines.length === 0 ? "(working tree clean)" : lines.join("\n");
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output, isError: false } });
      return `[git_status] Result:\n${output}`;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error running git status";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[git_status] Result: Error - ${errMsg}`;
    }
  }
}