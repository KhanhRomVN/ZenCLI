/**
 * RunCommandExecutor — executes a shell command in the workspace.
 * Captures stdout+stderr, returns exit code info.
 */

import { spawn } from "child_process";
import * as path from "path";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";
import { SecurityValidator } from "../../utils/security";

const MAX_OUTPUT_BYTES = 200 * 1024; // 200 KB cap on captured output

export class RunCommandExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const command = action.params.command || "";
    const folderPath = action.params.folder_path;
    const actionId = action.actionId;

    if (!command.trim()) {
      const errMsg = "Missing 'command' parameter";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[run_command] Result: Error - ${errMsg}`;
    }

    // Security check on command content
    const sec = SecurityValidator.validateCommand(command);
    if (!sec.safe) {
      const errMsg = sec.reason || "Command blocked by security policy";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[run_command for '${command}'] Result: Error - ${errMsg}`;
    }

    const cwd = folderPath
      ? (path.isAbsolute(folderPath) ? folderPath : path.resolve(context.workspacePath, folderPath))
      : context.workspacePath;

    try {
      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
        const child = spawn("/bin/bash", ["-c", command], {
          cwd,
          env: process.env,
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let truncated = false;

        child.stdout.on("data", (chunk: Buffer) => {
          if (stdout.length < MAX_OUTPUT_BYTES) {
            stdout += chunk.toString("utf-8");
          } else if (!truncated) {
            stdout += "\n... [output truncated at 200KB] ...";
            truncated = true;
          }
        });

        child.stderr.on("data", (chunk: Buffer) => {
          if (stderr.length < MAX_OUTPUT_BYTES) {
            stderr += chunk.toString("utf-8");
          }
        });

        child.on("error", (err) => reject(err));
        child.on("close", (code) => {
          resolve({ stdout, stderr, exitCode: code ?? 0 });
        });
      });

      const trimmedStdout = result.stdout.trim();
      const trimmedStderr = result.stderr.trim();
      const isSuccess = result.exitCode === 0;

      let outputParts: string[] = [];
      if (trimmedStdout) outputParts.push(trimmedStdout);
      if (trimmedStderr) outputParts.push(`[stderr]\n${trimmedStderr}`);
      if (!isSuccess) outputParts.push(`Error - Exit code ${result.exitCode}`);

      const combinedOutput = outputParts.join("\n\n") || "(no output)";
      const statusLabel = isSuccess ? "" : " Error";

      setToolOutputs({
        ...context.toolOutputs,
        [actionId]: { output: combinedOutput, isError: !isSuccess },
      });

      return `Output: [run_command for '${command}']${statusLabel}\n\`\`\`\n${combinedOutput}\n\`\`\``;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error running command";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[run_command for '${command}'] Result: Error - ${errMsg}`;
    }
  }
}