/**
 * Executor types for ZenCLI — adapted from Zen's executor-types.ts.
 * Removes React/webview dependencies; uses plain Node.js interfaces.
 */

export interface Diagnostic {
  severity: string;
  message: string;
  line: number;
  column: number;
  source?: string;
  code?: string | number;
}

export interface ToolOutput {
  output: string;
  isError: boolean;
  terminalId?: string;
  diagnostics?: Diagnostic[];
  version?: number;
}

/** Accepts either a full replacement record OR an updater function (prev → next),
 *  matching the dual usage pattern across existing executors. */
export type SetToolOutputs = (
  updater: Record<string, ToolOutput> | ((prev: Record<string, ToolOutput>) => Record<string, ToolOutput>),
) => void;

/** Shared context passed to every executor. */
export interface ExecutorContext {
  workspacePath: string;
  setToolOutputs: SetToolOutputs;
  getToolTimeout: (actionType: string) => number;
  /** Optional: conversation ID for checkpoint/history tracking */
  conversationId?: string;
  /** Response number of the triggering assistant message (1-based). */
  responseNumber?: number;
  /** Snapshot of current tool outputs — executors read this via spread pattern
   *  `{ ...context.toolOutputs, [actionId]: {...} }` before calling setToolOutputs. */
  toolOutputs?: Record<string, ToolOutput>;
}

export interface ToolExecutor {
  execute(
    action: any,
    context: ExecutorContext,
    options?: ExecutorOptions,
  ): Promise<string | null>;
}

export interface ExecutorOptions {
  skipDiagnostics?: boolean;
  bypassIgnore?: boolean;
}