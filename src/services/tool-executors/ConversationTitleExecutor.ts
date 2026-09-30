/**
 * ConversationTitleExecutor — display-only tool for ZenCLI.
 *
 * In the VSCode extension this posts a message to set the tab title via the
 * extension host. In CLI there is no such surface; the AI-emitted title is
 * simply acknowledged so the auto-loop can continue without blocking.
 */

import {
  ExecutorContext,
  ExecutorOptions,
  ToolExecutor,
} from "../../types/executor-types";

export class ConversationTitleExecutor implements ToolExecutor {
  async execute(
    action: any,
    context: ExecutorContext,
    _options: ExecutorOptions = {},
  ): Promise<string | null> {
    const { setToolOutputs } = context;
    const actionId = action.actionId;
    const title = (action.params.title || "").trim();

    if (!title) {
      setToolOutputs((prev) => ({
        ...prev,
        [actionId]: { output: "Error - title is required", isError: true },
      }));
      return "[conversation_title] Result: Error - title is required";
    }

    setToolOutputs((prev) => ({
      ...prev,
      [actionId]: { output: title, isError: false },
    }));

    return `[conversation_title] Result: Title updated to "${title}"`;
  }
}