/**
 * WriteToFileExecutor — creates or overwrites a file in the workspace.
 * Pure Node.js implementation.
 */

import * as fs from "fs";
import * as path from "path";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";
import { SecurityValidator } from "../../utils/security";

export class WriteToFileExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const filePath = action.params.file_path || action.params.path;
    const content = action.params.content || "";
    const actionId = action.actionId;
    const toolName = action.params.original_tool_name || "write_to_file";

    if (!filePath) {
      const errMsg = "Missing 'file_path' parameter";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[${toolName}] Result: Error - ${errMsg}`;
    }

    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(context.workspacePath, filePath);

    // Security check for write operations
    const sec = SecurityValidator.validatePath(resolvedPath, true);
    if (!sec.safe) {
      const errMsg = sec.reason || "Security validation failed";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[${toolName} for '${filePath}'] Result: Error - ${errMsg}`;
    }

    try {
      // Ensure parent directory exists
      const dir = path.dirname(resolvedPath);
      await fs.promises.mkdir(dir, { recursive: true });

      // Check if file already exists (for informational purposes)
      const fileExists = fs.existsSync(resolvedPath);

      // Write the file
      await fs.promises.writeFile(resolvedPath, content, "utf-8");

      const lineCount = content.split("\n").length;
      const resultMsg = fileExists
        ? `File overwritten successfully (${lineCount} lines)`
        : `File created successfully (${lineCount} lines)`;

      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: content, isError: false } });
      return `[${toolName} for '${filePath}'] Result: ${resultMsg}`;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error writing file";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[${toolName} for '${filePath}'] Result: Error - ${errMsg}`;
    }
  }
}