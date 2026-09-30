/**
 * ReadFileExecutor — reads a file from the workspace.
 * Pure Node.js implementation (no VSCode dependency).
 */

import * as fs from "fs";
import * as path from "path";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";
import { SecurityValidator } from "../../utils/security";

export class ReadFileExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs, getToolTimeout } = context;
    const filePath = action.params.file_path || action.params.path;
    const actionId = action.actionId;

    if (!filePath) {
      const errMsg = "Missing 'file_path' parameter";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[read_file] Result: Error - ${errMsg}`;
    }

    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(context.workspacePath, filePath);

    // Security check
    const sec = SecurityValidator.validatePath(resolvedPath, false);
    if (!sec.safe) {
      const errMsg = sec.reason || "Security validation failed";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[read_file for '${filePath}'] Result: Error - ${errMsg}`;
    }

    try {
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      let content = await fs.promises.readFile(resolvedPath, "utf-8");

      // Apply line range if specified
      const startLine = action.params.start_line;
      const endLine = action.params.end_line;
      if (startLine !== undefined) {
        const lines = content.split(/\r?\n/);
        const start = Math.max(0, Number(startLine) - 1); // Convert to 0-indexed
        const end = endLine !== undefined ? Number(endLine) : lines.length;
        content = lines.slice(start, end).join("\n");
      }

      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: content, isError: false } });
      return `[read_file for '${filePath}'] Result:\n\`\`\`\n${content}\n\`\`\``;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error reading file";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[read_file for '${filePath}'] Result: Error - ${errMsg}`;
    }
  }
}