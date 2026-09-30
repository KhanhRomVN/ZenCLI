/**
 * DeleteFileExecutor — removes a file from the workspace.
 */

import * as fs from "fs";
import * as path from "path";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";
import { SecurityValidator } from "../../utils/security";

export class DeleteFileExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const filePath = action.params.file_path || action.params.path;
    const actionId = action.actionId;

    if (!filePath) {
      const errMsg = "Missing 'file_path' parameter";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[delete_file] Result: Error - ${errMsg}`;
    }

    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(context.workspacePath, filePath);

    const sec = SecurityValidator.validatePath(resolvedPath, true);
    if (!sec.safe) {
      const errMsg = sec.reason || "Security validation failed";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[delete_file for '${filePath}'] Result: Error - ${errMsg}`;
    }

    try {
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      await fs.promises.unlink(resolvedPath);
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: "Deleted", isError: false } });
      return `[delete_file for '${filePath}'] Result: File deleted successfully`;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error deleting file";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[delete_file for '${filePath}'] Result: Error - ${errMsg}`;
    }
  }
}