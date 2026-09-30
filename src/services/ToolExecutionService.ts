/**
 * ToolExecutionService — Auto-loop engine for ZenCLI.
 *
 * Mirrors the architecture of Zen's useToolExecution hook:
 *   1. Listens to ChatService's "toolRequest" event (emitted after AI response parsing).
 *   2. Executes each action sequentially through getExecutor().
 *   3. Collects results and sends them back via sendMessage({ skipFirstRequestLogic: true }).
 *   4. Updates toolOutputs on the assistant message so the UI can render summaries.
 *
 * This is a plain Node.js EventEmitter-based service — no React dependency.
 * The React layer (useChat / Chat component) subscribes to its events to sync state.
 */

import { EventEmitter } from "events";
import type { Message } from "../types/message";
import type { ToolAction } from "../parsers/ResponseParser";
import type { ToolOutput, ExecutorContext } from "../types/executor-types";
import { getExecutor } from "./tool-executors";
import { parseAIResponse } from "../parsers/ResponseParser";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ToolExecutionEvents {
  /** Emitted when tool outputs are updated for a specific message */
  toolOutputsUpdated: (messageId: string, outputs: Record<string, ToolOutput>) => void;
  /** Emitted when execution starts/completes/errors */
  executionStateChanged: (state: ExecutionState) => void;
}

export interface ExecutionState {
  total: number;
  completed: number;
  status: "idle" | "running" | "done" | "error";
}

interface SendMessageFn {
  (options: {
    content: string;
    skipFirstRequestLogic?: boolean;
    uiHidden?: boolean;
    actionIds?: string[];
  }): Promise<void>;
}

// ─── Constants ──────────────────────────────────────────────────────────

/** Tools that are display-only (no actual execution needed, result not sent back). */
const DISPLAY_ONLY_TOOLS = new Set(["git_status", "commit_message"]);

// ─── Service ────────────────────────────────────────────────────────────

export class ToolExecutionService extends EventEmitter {
  private workspacePath: string;
  private sendMessageFn: SendMessageFn;
  private messagesRef: () => Message[];
  private setMessagesFn: (messages: Message[]) => void;

  /** Accumulated tool outputs per messageId */
  private toolOutputsMap: Map<string, Record<string, ToolOutput>> = new Map();

  /** Track which actions have been executed (to prevent double-execution) */
  private clickedActions: Set<string> = new Set();

  /** Buffer of valid results awaiting flush, keyed by messageId */
  private resultBuffers: Map<string, string[]> = new Map();

  /** Prevent flushing same message twice */
  private flushedMessageIds: Set<string> = new Set();

  /** Current execution state */
  private currentState: ExecutionState = { total: 0, completed: 0, status: "idle" };

  constructor(opts: {
    workspacePath: string;
    sendMessage: SendMessageFn;
    getMessages: () => Message[];
    setMessages: (messages: Message[]) => void;
  }) {
    super();
    this.workspacePath = opts.workspacePath;
    this.sendMessageFn = opts.sendMessage;
    this.messagesRef = opts.getMessages;
    this.setMessagesFn = opts.setMessages;
  }

  // ─── Public API ─────────────────────────────────────────────────────

  /**
   * Attach to a ChatService instance. Subscribes to "toolRequest" events.
   * Returns a cleanup function to detach.
   */
  attach(chatService: { on: Function; off: Function }): () => void {
    const handler = (actions: ToolAction[], assistantMessage: Message) => {
      this.handleToolRequest(actions, assistantMessage).catch((err) => {
        console.error("[ToolExecutionService] Unhandled error:", err);
      });
    };

    chatService.on("toolRequest", handler);
    return () => chatService.off("toolRequest", handler);
  }

  /** Get current tool outputs for a given message ID (for UI rendering). */
  getToolOutputs(messageId: string): Record<string, ToolOutput> | undefined {
    return this.toolOutputsMap.get(messageId);
  }

  /** Reset all internal state (called on session reset). */
  reset(): void {
    this.toolOutputsMap.clear();
    this.clickedActions.clear();
    this.resultBuffers.clear();
    this.flushedMessageIds.clear();
    this.currentState = { total: 0, completed: 0, status: "idle" };
    this.emit("executionStateChanged", this.currentState);
  }

  // ─── Core Logic ─────────────────────────────────────────────────────

  private async handleToolRequest(
    actions: ToolAction[],
    assistantMessage: Message,
  ): Promise<void> {
    const messageId = assistantMessage.id;

    // Initialize buffers/output maps for this message if first time
    if (!this.resultBuffers.has(messageId)) {
      this.resultBuffers.set(messageId, []);
    }
    if (!this.toolOutputsMap.has(messageId)) {
      this.toolOutputsMap.set(messageId, {});
    }

    this.currentState = {
      total: actions.length,
      completed: 0,
      status: "running",
    };
    this.emit("executionStateChanged", this.currentState);

    const validResults: string[] = [];

    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];
      const actionId = `${messageId}-action-${index}`;

      // Skip already-clicked actions (prevent re-execution on rapid triggers)
      if (this.clickedActions.has(actionId)) {
        continue;
      }

      // Mark as clicked immediately (sync) to prevent concurrent duplicates
      this.clickedActions.add(actionId);

      // Display-only tools: don't execute, don't collect result
      if (DISPLAY_ONLY_TOOLS.has(action.type)) {
        this.currentState.completed++;
        this.emit("executionStateChanged", this.currentState);
        continue;
      }

      const executor = getExecutor(action.type);
      if (!executor) {
        console.warn(`[ToolExecutionService] No executor for: "${action.type}"`);
        const errMsg = `[${action.type}] Result: Error - No executor found for type "${action.type}"`;
        validResults.push(errMsg);
        this.updateToolOutput(messageId, actionId, { output: "No executor found", isError: true });
        this.currentState.completed++;
        this.emit("executionStateChanged", this.currentState);
        continue;
      }

      try {
        const context = this.buildExecutorContext(messageId);
        const enrichedAction = { ...action, actionId };
        const result = await executor.execute(enrichedAction, context, {});

        if (result !== null) {
          validResults.push(result);

          // Parse clean output for UI display
          const cleanOutput = this.extractCleanOutput(result);
          const isError = this.detectError(result);
          this.updateToolOutput(messageId, actionId, { output: cleanOutput, isError });
        } else {
          // Executor returned null — unexpected failure
          const errMsg = `[${action.type}] Result: Error - Executor returned null`;
          validResults.push(errMsg);
          this.updateToolOutput(messageId, actionId, { output: "Executor returned null", isError: true });
        }
      } catch (e: any) {
        const errMsg = `[${action.type}] Result: Error - ${e.message || "Unknown execution error"}`;
        validResults.push(errMsg);
        this.updateToolOutput(messageId, actionId, { output: e.message || "Unknown error", isError: true });
      }

      this.currentState.completed++;
      this.emit("executionStateChanged", this.currentState);
    }

    // Merge results into buffer
    const existingBuffer = this.resultBuffers.get(messageId) || [];
    const mergedBuffer = [...existingBuffer, ...validResults];
    this.resultBuffers.set(messageId, mergedBuffer);

    // Attempt flush
    this.tryFlush(messageId, assistantMessage, mergedBuffer);

    this.currentState.status = "done";
    this.emit("executionStateChanged", this.currentState);
  }

  // ─── Flush Logic ────────────────────────────────────────────────────

  /**
   * Check if ALL actions for a message have been executed, then send results back.
   * Mirrors Zen's auto-flush mechanism.
   */
  private tryFlush(
    messageId: string,
    assistantMessage: Message,
    buffer: string[],
  ): void {
    if (buffer.length === 0) return;
    if (this.flushedMessageIds.has(messageId)) return;

    // Re-parse the assistant message to get full action list
    const parsed = parseAIResponse(assistantMessage.content);
    const allActionIds = parsed.actions.map(
      (_: any, idx: number) => `${messageId}-action-${idx}`,
    );

    // Check if all actions have been clicked/executed
    const allComplete = allActionIds.every((id) => this.clickedActions.has(id));
    if (!allComplete) return;

    // Count expected executable results (exclude display-only)
    const executableCount = parsed.actions.filter(
      (a) => !DISPLAY_ONLY_TOOLS.has(a.type),
    ).length;

    // Only flush if we have enough results
    if (buffer.length < executableCount) return;

    // Build final content
    let finalContent = buffer.join("\n\n");

    // Check if there's an unanswered question attached to this message
    const hasQuestion = !!parsed.question;
    if (hasQuestion) {
      // Don't flush yet — wait for user to answer the question first
      // The question answer flow will trigger another sendMessage which handles this
      return;
    }

    // Determine if any errors occurred
    const hasAnyError = buffer.some(
      (r) =>
        r.includes("Result: Error") ||
        r.includes("Tool execution blocked") ||
        r.includes("Tool execution rejected"),
    );

    this.flushedMessageIds.add(messageId);

    // Send results back to ChatService → next LLM turn
    this.sendMessageFn({
      content: finalContent,
      skipFirstRequestLogic: true,
      uiHidden: !hasAnyError,
      actionIds: allActionIds,
    }).catch((err) => {
      console.error("[ToolExecutionService] Failed to send tool results:", err);
    });

    // Clear buffer for this message
    this.resultBuffers.delete(messageId);
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private buildExecutorContext(messageId: string): ExecutorContext {
    const outputs = this.toolOutputsMap.get(messageId) || {};
    return {
      workspacePath: this.workspacePath,
      conversationId: messageId,
      getToolTimeout: () => 60_000,
      // Executors expect both setToolOutputs AND direct access to current outputs
      // via context.toolOutputs spread pattern. Provide a proxy-compatible shape.
      setToolOutputs: (updater: Record<string, ToolOutput>) => {
        this.toolOutputsMap.set(messageId, updater);
        this.emit("toolOutputsUpdated", messageId, updater);
        // Also update the assistant message in the messages array so UI reflects it
        this.syncToolOutputsToMessage(messageId, updater);
      },
      // Some executors read context.toolOutputs directly (spread pattern)
      ...(outputs ? { toolOutputs: outputs } : {}),
    } as ExecutorContext & { toolOutputs?: Record<string, ToolOutput> };
  }

  /** Push tool outputs onto the corresponding Message object so Chat.tsx renders them. */
  private syncToolOutputsToMessage(
    messageId: string,
    outputs: Record<string, ToolOutput>,
  ): void {
    const msgs = this.messagesRef();
    const target = msgs.find((m) => m.id === messageId);
    if (!target) return;

    // Mutate in place — Ink will re-render because setMessages triggers React state update
    (target as any).toolOutputs = outputs;
    this.setMessagesFn([...msgs]);
  }

  /** Extract human-readable output from raw executor result string. */
  private extractCleanOutput(raw: string): string {
    let clean = raw;
    const prefixMatch = raw.match(/^\[.*?\]\s*Result:\s*/);
    if (prefixMatch) {
      clean = raw.substring(prefixMatch[0].length);
    }
    // Strip surrounding code fences if present
    if (clean.startsWith("```\n") && clean.endsWith("\n```")) {
      clean = clean.substring(4, clean.length - 4);
    } else if (clean.startsWith("```") && clean.endsWith("```")) {
      clean = clean.substring(3, clean.length - 3);
    }
    return clean.trim();
  }

  /** Detect whether an executor result represents an error. */
  private detectError(raw: string): boolean {
    return (
      raw.includes("Result: Error") ||
      raw.includes("Tool execution blocked") ||
      raw.includes("Tool execution rejected")
    );
  }

  private updateToolOutput(
    messageId: string,
    actionId: string,
    output: ToolOutput,
  ): void {
    const current = this.toolOutputsMap.get(messageId) || {};
    const updated = { ...current, [actionId]: output };
    this.toolOutputsMap.set(messageId, updated);
    this.emit("toolOutputsUpdated", messageId, updated);
    this.syncToolOutputsToMessage(messageId, updated);
  }
}