/**
 * ReplaceInFileExecutor — replaces a substring in an existing file.
 * Pure Node.js implementation with fuzzy-match fallback via FuzzyMatcher util.
 */

import * as fs from "fs";
import * as path from "path";
import type { ToolExecutor, ExecutorContext, ExecutorOptions } from "../../types/executor-types";
import { SecurityValidator } from "../../utils/security";
import { FuzzyMatcher } from "../../utils/FuzzyMatcher";

export class ReplaceInFileExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const filePath = action.params.file_path || action.params.path;
    const oldContent = action.params.old_content ?? "";
    const newContent = action.params.new_content ?? "";
    const actionId = action.actionId;
    const resultToolName = action.params.original_tool_name || "replace_in_file";
    const resultPath = action.params.original_path || filePath;

    // Parser-level validation error passthrough
    if (action.params._validationError) {
      const errMsg = action.params._validationError;
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[${resultToolName} for '${resultPath}'] Result: Error - ${errMsg}`;
    }

    if (!filePath) {
      const errMsg = "Missing 'file_path' parameter";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[${resultToolName}] Result: Error - ${errMsg}`;
    }

    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(context.workspacePath, filePath);

    const sec = SecurityValidator.validatePath(resolvedPath, true);
    if (!sec.safe) {
      const errMsg = sec.reason || "Security validation failed";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[${resultToolName} for '${resultPath}'] Result: Error - ${errMsg}`;
    }

    try {
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const rawContent = await fs.promises.readFile(resolvedPath, "utf-8");
      const hasCRLF = rawContent.includes("\r\n");
      const normalizedContent = rawContent.replace(/\r\n/g, "\n");
      const normalizedSearch = oldContent.replace(/\r\n/g, "\n");
      const normalizedReplace = newContent.replace(/\r\n/g, "\n");

      let targetPos = normalizedContent.indexOf(normalizedSearch);
      let matchLength = normalizedSearch.length;

      if (targetPos === -1) {
        // Fuzzy fallback
        const fuzzy = FuzzyMatcher.findMatch(normalizedContent, normalizedSearch);
        if (!fuzzy || fuzzy.similarity < 0.6) {
          throw new Error("Search text not found");
        }
        targetPos = normalizedContent.indexOf(fuzzy.originalText);
        if (targetPos === -1) {
          throw new Error("Search text not found after fuzzy match");
        }
        matchLength = fuzzy.originalText.length;
      }

      const updatedContent =
        normalizedContent.slice(0, targetPos) +
        normalizedReplace +
        normalizedContent.slice(targetPos + matchLength);

      if (updatedContent === normalizedContent) {
        throw new Error("No change made");
      }

      const finalContent = hasCRLF ? updatedContent.replace(/\n/g, "\r\n") : updatedContent;
      await fs.promises.writeFile(resolvedPath, finalContent, "utf-8");

      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: finalContent, isError: false } });
      return `[${resultToolName} for '${resultPath}'] Result: File updated successfully`;
    } catch (e: any) {
      const errMsg = e.message || "Unknown error replacing content";
      setToolOutputs({ ...context.toolOutputs, [actionId]: { output: `Error - ${errMsg}`, isError: true } });
      return `[${resultToolName} for '${resultPath}'] Result: Error - ${errMsg}`;
    }
  }
}