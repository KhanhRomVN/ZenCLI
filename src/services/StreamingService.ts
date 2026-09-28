/**
 * StreamingService — SSE streaming for LLM chat responses.
 * Adapted from Zen for ZenCLI:
 * - Removed vscode/webview dependencies (localStorage, streamingPreviewStore)
 * - Uses native fetch + ReadableStream (Node 18+)
 * - Callbacks are pure functions, no React state coupling
 */

import type { Message } from "../types/message";

// ─── Types ──────────────────────────────────────────────────────────────

export interface StreamConfig {
  apiUrl: string;
  model: any;
  account: any;
  messages: Array<{ role: string; content: string }>;
  conversationId?: string;
  parentMessageId?: string;
  abortSignal: AbortSignal;
  /** For Qwen: pre-generated fid for the user message. */
  messageFid?: string;
  /** For Qwen edit/regenerate: action type ("edit"). */
  userAction?: string;
  /** For Qwen edit/regenerate: fid of the user message to overwrite. */
  editMessageId?: string;
}

export interface StreamCallbacks {
  onMetadata?: (meta: any) => void;
  onContent?: (content: string) => void;
  onThinking?: (thinking: string) => void;
  onUsage?: (usage: any) => void;
  onContinuing?: (isContinuing: boolean) => void;
  onRawContent?: (content: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Simple token estimation: ~4 chars per token */
const calculateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

// ─── Service ────────────────────────────────────────────────────────────

export class StreamingService {
  static async streamChat(
    config: StreamConfig,
    callbacks: StreamCallbacks,
  ): Promise<{ message: Message; backendConversationId: string }> {
    const body = {
      modelId: config.model?.id,
      providerId: config.model?.providerId,
      accountId: config.account?.id,
      messages: config.messages,
      stream: true,
      ...(config.conversationId
        ? { conversationId: config.conversationId }
        : {}),
      ...(config.parentMessageId
        ? { parent_message_id: config.parentMessageId }
        : {}),
      ...(config.userAction ? { user_action: config.userAction } : {}),
      ...(config.editMessageId
        ? { edit_message_id: config.editMessageId }
        : {}),
      ...(config.messageFid && !config.editMessageId
        ? { message_fid: config.messageFid }
        : {}),
    };

    const response = await fetch(`${config.apiUrl}/v1/chat/accounts/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: config.abortSignal,
    });

    if (!response.ok) {
      let errorDetail = `API Error: ${response.status}`;
      try {
        const errBody = (await response.json()) as Record<string, any>;
        const raw = errBody.error || errBody.message;
        const msg = typeof raw === "string" ? raw : JSON.stringify(raw);
        errorDetail = msg || errorDetail;
        if (errBody.error_code)
          errorDetail = `[${errBody.error_code}] ${errorDetail}`;
      } catch {
        // Use default error detail
      }
      throw new Error(errorDetail);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let assistantMessage: Message = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    let backendConversationId = "";
    let done = false;
    let buffer = "";
    let firstChunkReceived = false;

    // Batching for smooth streaming
    let updateBatch = { content: "", thinking: "" };
    let lastFlushTime = Date.now();
    const FLUSH_INTERVAL_MS = 8;

    // First-chunk timeout (5 minutes)
    const FIRST_CHUNK_TIMEOUT_MS = 305_000;
    const firstChunkTimer = setTimeout(() => {
      if (!firstChunkReceived) {
        config.abortSignal.dispatchEvent(new Event("abort"));
      }
    }, FIRST_CHUNK_TIMEOUT_MS);

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          clearTimeout(firstChunkTimer);
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;

            // Handle UUID conversation_id
            if (
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                dataStr,
              )
            ) {
              backendConversationId = dataStr;
              continue;
            }

            try {
              const data = JSON.parse(dataStr);

              // Handle stream error
              if (data.error) {
                const code = data.error_code ? `[${data.error_code}] ` : "";
                const err = new Error(`${code}${data.error}`);
                (err as any).isServerError = true;
                throw err;
              }

              // Conversation ID
              const recvConvId =
                data.meta?.conversation_id || data.conversation_id;
              if (recvConvId) {
                backendConversationId = recvConvId;
                assistantMessage.conversationId = recvConvId;
              }

              // Metadata
              const metaObj = data.meta || data.metadata;
              if (metaObj) {
                if (metaObj.providerId)
                  assistantMessage.providerId = metaObj.providerId;
                if (metaObj.modelId) assistantMessage.modelId = metaObj.modelId;
                if (metaObj.accountId)
                  assistantMessage.accountId = metaObj.accountId;
                if (metaObj.websiteUrl)
                  assistantMessage.websiteUrl = metaObj.websiteUrl;
                if (metaObj.email) assistantMessage.email = metaObj.email;
                if (metaObj.response_message_id)
                  assistantMessage.response_message_id =
                    metaObj.response_message_id;

                callbacks.onMetadata?.(metaObj);

                if (metaObj.continuing !== undefined) {
                  callbacks.onContinuing?.(metaObj.continuing);
                }
              }

              // Usage
              if (data.usage) {
                assistantMessage.usage = data.usage;
                assistantMessage.token_usage = data.usage.total_tokens;
                callbacks.onUsage?.(data.usage);
              }

              // Content
              if (data.content) {
                assistantMessage.content += data.content;
                updateBatch.content += data.content;
              }

              if (data.thinking) {
                assistantMessage.thinking =
                  (assistantMessage.thinking || "") + data.thinking;
                updateBatch.thinking += data.thinking;
              }

              // Flush batch
              const now = Date.now();
              const shouldFlush =
                now - lastFlushTime >= FLUSH_INTERVAL_MS || data.usage;

              if (
                shouldFlush &&
                (updateBatch.content || updateBatch.thinking || data.usage)
              ) {
                if (updateBatch.content) {
                  callbacks.onRawContent?.(updateBatch.content);
                }
                if (updateBatch.thinking) {
                  callbacks.onThinking?.(updateBatch.thinking);
                }
                updateBatch = { content: "", thinking: "" };
                lastFlushTime = now;
              }
            } catch (e) {
              if (e instanceof Error && (e as any).isServerError) throw e;
            }
          }
        }
      }
    }

    clearTimeout(firstChunkTimer);

    // Flush remaining content for final parsing
    if (assistantMessage.content) {
      callbacks.onContent?.(assistantMessage.content);
    }
    if (updateBatch.thinking) {
      callbacks.onThinking?.(updateBatch.thinking);
    }

    // Process remaining buffer
    const remainingLines = buffer
      .split("\n")
      .filter((l) => l.trim().startsWith("data: "));
    for (const line of remainingLines) {
      const dataStr = line.slice(6).trim();
      if (dataStr === "[DONE]") continue;

      try {
        const data = JSON.parse(dataStr);
        const metaObj = data.meta || data.metadata;

        if (metaObj) {
          if (metaObj.providerId)
            assistantMessage.providerId = metaObj.providerId;
          if (metaObj.modelId) assistantMessage.modelId = metaObj.modelId;
          if (metaObj.accountId) assistantMessage.accountId = metaObj.accountId;
          if (metaObj.websiteUrl)
            assistantMessage.websiteUrl = metaObj.websiteUrl;
          if (metaObj.email) assistantMessage.email = metaObj.email;
          callbacks.onMetadata?.(metaObj);
        }

        if (data.usage) {
          assistantMessage.usage = data.usage;
          assistantMessage.token_usage = data.usage.total_tokens;
        }

        if (data.content) assistantMessage.content += data.content;
        if (data.thinking)
          assistantMessage.thinking =
            (assistantMessage.thinking || "") + data.thinking;
      } catch {
        // Skip malformed lines
      }
    }

    // Fallback token calculation
    if (!assistantMessage.token_usage && assistantMessage.content) {
      assistantMessage.token_usage = calculateTokens(assistantMessage.content);
    }

    // Combine thinking + content for rawResponse
    assistantMessage.rawResponse = assistantMessage.thinking
      ? `${assistantMessage.thinking}\n\n${assistantMessage.content}`
      : assistantMessage.content;

    return { message: assistantMessage, backendConversationId };
  }
}
