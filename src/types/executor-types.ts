/**
 * ------------------------------------------------------------------
 * Executor Types
 * ------------------------------------------------------------------
 * Hợp đồng giao tiếp giữa Engine thực thi Tool và môi trường xung quanh.
 * Đảm bảo tính độc lập của các Executor khỏi framework UI (React/Webview).
 *
 * Main types:
 * - ToolOutput       : Kết quả trả về sau khi chạy xong một Action
 * - ExecutorContext  : Bối cảnh chia sẻ (đường dẫn, hàm setter, timeout...)
 * - ToolExecutor     : Interface chuẩn hóa cho mọi class thực thi Tool
 * ------------------------------------------------------------------
 */

// ─── Types & Interfaces ────────────────────────────────────────────────
export interface ToolOutput {
  output: string;
  isError: boolean;
  terminalId?: string;
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
  bypassIgnore?: boolean;
}