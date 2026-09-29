/**
 * ChatService — Class-based chat business logic for ZenCLI.
 * Refactored from useChatLLM (1406 lines) to separate business logic from React.
 *
 * Responsibilities:
 * - Send messages to LLM API via StreamingService
 * - Parse AI responses via ResponseParser
 * - Manage conversation state (messages, IDs, model/account)
 * - Handle Claude content processing
 * - Question answer parsing
 *
 * NOT responsible for:
 * - React state management (useChat hook handles this)
 * - Tool execution (separate ToolExecutionService in Phase 3)
 * - File upload (not needed for CLI MVP)
 * - VSCode-specific features (workspace zip, diagnostics, extensionService)
 */

import { EventEmitter } from "events";
import * as os from "os";
import type { Message, QuestionAnswer } from "../types/message";
import { parseAIResponse } from "../parsers/ResponseParser";
import { StreamingService } from "./StreamingService";
import { processClaudeContent } from "./ClaudeContentProcessor";
import type { ToolAction, ParsedResponse } from "../parsers/ResponseParser";
import { combinePromptsForMode } from "../prompts";
import type { SystemPromptMode, PromptLengthMode } from "../prompts";
import type { SystemInfo } from "../prompts/system-context";
import { buildSkillsSection } from "./SkillService";

// ─── Types ──────────────────────────────────────────────────────────────

/** Runtime flags điều khiển system prompt — được cập nhật realtime từ UI */
export interface RuntimeFlags {
  promptLengthMode: PromptLengthMode;
  systemPromptMode: SystemPromptMode;
  diagnosticEnabled: boolean;
  skillsEnabled: boolean;
}

export interface ChatServiceConfig {
  apiUrl: string;
  workspacePath: string;
  aiLanguage: string;
  permissionMode: string;
  /** Runtime flags — đọc mỗi lần build system prompt (không snapshot lúc khởi tạo).
   *  Trả về undefined nếu chưa có getter được nối từ UI → coi như không gửi system prompt. */
  getRuntimeFlags?: () => RuntimeFlags | undefined;
}

export interface SendMessageOptions {
  content: string;
  model?: any;
  account?: any;
  skipFirstRequestLogic?: boolean;
  actionIds?: string[];
  uiHidden?: boolean;
  parentMessageId?: string;
  extraOptions?: {
    user_action?: string;
    edit_message_id?: string;
    parent_message_id?: string;
  };
}

export interface ChatServiceEvents {
  messageAdded: (message: Message) => void;
  messagesUpdated: (messages: Message[]) => void;
  processingChanged: (isProcessing: boolean) => void;
  streamingChanged: (isStreaming: boolean) => void;
  continuingChanged: (isContinuing: boolean) => void;
  conversationIdChanged: (id: string) => void;
  toolRequest: (actions: ToolAction[], assistantMessage: Message) => void;
  error: (error: Error) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────

const calculateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

/**
 * Build system prompt từ runtime flags hiện tại.
 * Trả về "" khi promptLengthMode === "none" (ẩn hoàn toàn).
 */
function buildSystemPromptForFlags(
  config: ChatServiceConfig,
  providerId?: string,
): string {
  const flags = config.getRuntimeFlags?.();
  if (!flags) return "";

  // NONE → không gửi system prompt nào cả
  if (flags.promptLengthMode === "none") return "";

  const systemInfo: SystemInfo = {
    os: process.platform === "win32" ? "Windows" : process.platform === "darwin" ? "macOS" : "Linux",
    shell: process.env.SHELL || "/bin/bash",
    homeDir: os.homedir(),
    cwd: config.workspacePath,
    language: config.aiLanguage,
  };

  const basePrompt = combinePromptsForMode(
    {
      language: config.aiLanguage,
      systemInfo,
      promptLengthMode: flags.promptLengthMode,
      diagnosticEnabled: flags.diagnosticEnabled,
    },
    flags.systemPromptMode,
  );

  // Append installed-skills section when toggle is ON (mirrors webview PromptBuilder)
  if (!flags.skillsEnabled) return basePrompt;
  return `${basePrompt}${buildSkillsSection()}`;
}
/**
 * Parse <question-answer> tag from user content.
 */
export const parseQuestionAnswerTag = (
  content: string,
): Record<string, QuestionAnswer> | null => {
  const regex = /<question-answer>([\s\S]*?)<\/question-answer>/i;
  const match = regex.exec(content);
  if (!match) return null;

  const innerContent = match[1].trim();
  const answers: Record<string, QuestionAnswer> = {};

  const lines = innerContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const lineMatch = /^(\d+)\.\s*(.*)$/i.exec(trimmed);
    if (!lineMatch) continue;

    const lineNumber = parseInt(lineMatch[1], 10);
    const answerText = lineMatch[2].trim();
    const questionId = String(lineNumber);

    if (!answerText) continue;

    let parsedValue: string | string[] | boolean = answerText;
    if (answerText.toLowerCase() === "true") parsedValue = true;
    else if (answerText.toLowerCase() === "false") parsedValue = false;

    answers[questionId] = { questionId, value: parsedValue };
  }

  return Object.keys(answers).length > 0 ? answers : null;
};

// ─── Service ────────────────────────────────────────────────────────────

export class ChatService extends EventEmitter {
  private config: ChatServiceConfig;
  private messages: Message[] = [];
  private currentConversationId = "";
  private backendConversationId = "";
  private lastUsedModel: any = null;
  private lastUsedAccount: any = null;
  private abortController: AbortController | null = null;
  private qwenParentId: string | undefined = undefined;
  private userRequestCount = 0;
  private _isProcessing = false;
  private _isStreaming = false;
  private _isContinuing = false;

  constructor(config: ChatServiceConfig) {
    super();
    this.config = config;
  }

  // ─── Getters ──────────────────────────────────────────────────────────

  getMessages(): Message[] {
    return this.messages;
  }

  getCurrentConversationId(): string {
    return this.currentConversationId;
  }

  getBackendConversationId(): string {
    return this.backendConversationId;
  }

  getIsProcessing(): boolean {
    return this._isProcessing;
  }

  getIsStreaming(): boolean {
    return this._isStreaming;
  }

  getIsContinuing(): boolean {
    return this._isContinuing;
  }

  getLastUsedModel(): any {
    return this.lastUsedModel;
  }

  getLastUsedAccount(): any {
    return this.lastUsedAccount;
  }

  // ─── Setters ──────────────────────────────────────────────────────────

  setLastUsedModel(model: { id: string; providerId: string } | null): void {
    this.lastUsedModel = model;
  }

  setLastUsedAccount(account: { id: string; email?: string } | null): void {
    this.lastUsedAccount = account;
  }

  setMessages(messages: Message[]): void {
    this.messages = messages;
    this.emit("messagesUpdated", messages);
  }

  setConfig(config: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setBackendConversationId(
    id: string,
    meta?: { providerId?: string; modelId?: string; accountId?: string },
  ): void {
    this.backendConversationId = id;
    if (meta) {
      if (meta.providerId && meta.modelId) {
        this.lastUsedModel = { id: meta.modelId, providerId: meta.providerId };
      }
      if (meta.accountId) {
        this.lastUsedAccount = { id: meta.accountId };
      }
    }
  }

  // ─── Session Management ───────────────────────────────────────────────

  resetSession(): void {
    this.currentConversationId = "";
    this.backendConversationId = "";
    this.messages = [];
    this.lastUsedModel = null;
    this.lastUsedAccount = null;
    this.qwenParentId = undefined;
    this.userRequestCount = 0;
    this.setProcessing(false);
    this.setStreaming(false);
    this.setContinuing(false);
    this.emit("messagesUpdated", []);
    this.emit("conversationIdChanged", "");
  }

  stopGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Cleanup if first turn of new session
    if (this._isProcessing && this.messages.length <= 2) {
      const chatId = this.currentConversationId;
      if (chatId) {
        this.currentConversationId = "";
        this.messages = [];
        this.userRequestCount = 0;
        this.emit("messagesUpdated", []);
        this.emit("conversationIdChanged", "");
      }
    }

    this.setStreaming(false);
    this.setContinuing(false);
    this.setProcessing(false);
  }

  // ─── Core: Send Message ───────────────────────────────────────────────

  async sendMessage(options: SendMessageOptions): Promise<void> {
    const {
      content,
      model,
      account,
      skipFirstRequestLogic = false,
      actionIds,
      uiHidden,
      parentMessageId,
      extraOptions,
    } = options;

    if (this._isProcessing && !skipFirstRequestLogic) {
      return;
    }

    // Filter cancelled messages
    let filteredMessages = this.messages.filter((m) => !m.isCancelled);

    // For Qwen edit/regenerate: trim messages up to edited user message
    if (extraOptions?.user_action === "edit" && extraOptions.edit_message_id) {
      const editFid = extraOptions.edit_message_id;
      const editIdx = filteredMessages.findIndex(
        (m) => m.role === "user" && m.providerFid === editFid,
      );
      if (editIdx !== -1) {
        filteredMessages = filteredMessages.slice(0, editIdx + 1);
        this.messages = filteredMessages;
        this.emit("messagesUpdated", filteredMessages);
      }
    }

    // Clean up incomplete message pairs
    const isEditFlow = extraOptions?.user_action === "edit";
    if (!skipFirstRequestLogic && !isEditFlow && filteredMessages.length > 0) {
      const lastMsg = filteredMessages[filteredMessages.length - 1];
      if (lastMsg.role === "user") {
        filteredMessages = filteredMessages.slice(0, -1);
        this.messages = filteredMessages;
        this.emit("messagesUpdated", filteredMessages);
      } else if (lastMsg.role === "assistant" && lastMsg.isError) {
        filteredMessages = filteredMessages.slice(0, -2);
        this.messages = filteredMessages;
        this.emit("messagesUpdated", filteredMessages);
      }
    }

    let effectiveChatUuid = this.currentConversationId;
    const isNewSession = !effectiveChatUuid;

    // Guard: tool results must never create new session
    if (skipFirstRequestLogic && isNewSession) {
      return;
    }

    if (isNewSession) {
      effectiveChatUuid = crypto.randomUUID();
      this.currentConversationId = effectiveChatUuid;
      this.backendConversationId = "";
      if (model) this.lastUsedModel = model;
      if (account) this.lastUsedAccount = account;
      this.emit("conversationIdChanged", effectiveChatUuid);
    }

    const isReq1 = filteredMessages.length === 0 && !skipFirstRequestLogic;

    if (!skipFirstRequestLogic) {
      this.userRequestCount += 1;
    }

    // Resolve model and account
    let finalModel = model || this.lastUsedModel;
    let finalAccount = account || this.lastUsedAccount;

    // History fallback for fresh session
    if (!finalModel) {
      const lastMetadataMsg = [...filteredMessages]
        .reverse()
        .find((m) => m.role === "assistant" && m.providerId && m.modelId);
      if (lastMetadataMsg) {
        finalModel = {
          id: lastMetadataMsg.modelId!,
          providerId: lastMetadataMsg.providerId!,
        };
      }
    }

    if (!finalAccount) {
      const lastMetadataMsg = [...filteredMessages]
        .reverse()
        .find((m) => m.role === "assistant" && m.accountId);
      if (lastMetadataMsg?.accountId) {
        finalAccount = { id: lastMetadataMsg.accountId };
      }
    }

    if (finalModel) this.lastUsedModel = finalModel;
    if (finalAccount) this.lastUsedAccount = finalAccount;

    // Guard: cannot send without a model selected
    if (!finalModel && !skipFirstRequestLogic) {
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "⚠ No model selected. Please use /model-account to choose a provider and model first.",
        timestamp: Date.now(),
        isError: true,
      };
      this.messages = [...this.messages.filter((m) => !m.isCancelled), errorMsg];
      this.emit("messagesUpdated", this.messages);
      return;
    }

    // Build user message content
    // For CLI: simplified prompt building (no workspace tree, no file upload)
    let promptPayload = skipFirstRequestLogic
      ? content
      : `## User Message\n<user-message>\n${content}\n</user-message>`;

    // On the first request of a session, prepend the system prompt directly
    // into the user message content — mirroring the webview's PromptBuilder
    // approach (`${systemPrompt}\n\n${fullContent}`). The backend API does not
    // accept a separate role:"system" message; it expects everything inside
    // the messages array as user/assistant turns.
    if (isReq1 && !skipFirstRequestLogic) {
      const systemPrompt = buildSystemPromptForFlags(
        this.config,
        finalModel?.providerId,
      );
      if (systemPrompt) {
        promptPayload = `${systemPrompt}\n\n${promptPayload}`;
      }
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}-${skipFirstRequestLogic ? "tool" : "user"}`,
      role: "user",
      content: promptPayload,
      timestamp: Date.now(),
      token_usage: calculateTokens(promptPayload),
      actionIds,
      uiHidden,
      conversationId: this.backendConversationId || undefined,
    };

    const updatedMessages = [...filteredMessages, userMessage];

    // Parse question answers from content
    const parsedAnswers = parseQuestionAnswerTag(content);
    if (parsedAnswers) {
      for (let i = updatedMessages.length - 2; i >= 0; i--) {
        const msg = updatedMessages[i];
        if (msg.role === "assistant") {
          const parsed = parseAIResponse(msg.content);
          if (
            parsed.question &&
            parsed.question.type === "question" &&
            "questions" in parsed.question &&
            parsed.question.questions &&
            parsed.question.questions.length > 0
          ) {
            updatedMessages[i] = { ...msg, questionAnswers: parsedAnswers };
            break;
          }
        }
      }
    }

    this.messages = updatedMessages;
    this.emit("messagesUpdated", updatedMessages);
    this.setProcessing(true);

    try {
      // Prepare messages for API.
      // System prompt is already embedded in the first user message's content
      // (see promptPayload construction above), so no separate role:"system"
      // entry is needed here — the backend expects plain user/assistant turns.
      const payloadMessages = updatedMessages
        .filter((m) => !m.isError)
        .map((m) => ({ role: m.role, content: m.content }));

      const effectiveParentMessageId = this.qwenParentId ?? parentMessageId;

      // Setup abort controller
      const abortController = new AbortController();
      this.abortController = abortController;
      this.setStreaming(true);

      // Save raw request
      userMessage.rawRequest = userMessage.content;

      // For Qwen: pre-generate fid
      const isQwenProvider =
        (finalModel?.providerId ?? "").toLowerCase() === "qwen";
      const qwenMessageFid =
        isQwenProvider && !skipFirstRequestLogic
          ? crypto.randomUUID()
          : undefined;

      if (qwenMessageFid) {
        userMessage.providerFid = qwenMessageFid;
        userMessage.providerParentId = effectiveParentMessageId ?? undefined;
      }

      // Create placeholder assistant message
      const assistantMessageId = `msg-${Date.now()}-assistant`;
      const placeholderAssistant: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      this.messages = [...updatedMessages, placeholderAssistant];
      this.emit("messagesUpdated", this.messages);

      // Track claude parsed content
      let claudeParsedContent = "";

      // Stream the response
      const { message: assistantMessage, backendConversationId } =
        await StreamingService.streamChat(
          {
            apiUrl: this.config.apiUrl,
            model: finalModel,
            account: finalAccount,
            messages: payloadMessages,
            conversationId: this.backendConversationId || undefined,
            parentMessageId: effectiveParentMessageId,
            abortSignal: abortController.signal,
            ...(qwenMessageFid ? { messageFid: qwenMessageFid } : {}),
            ...(extraOptions?.user_action
              ? { userAction: extraOptions.user_action }
              : {}),
            ...(extraOptions?.edit_message_id
              ? { editMessageId: extraOptions.edit_message_id }
              : {}),
          },
          {
            onMetadata: (meta) => {
              if (meta.parent_id) this.qwenParentId = meta.parent_id;
              if (meta.providerId || meta.modelId) {
                this.lastUsedModel = {
                  id: meta.modelId || this.lastUsedModel?.id,
                  providerId: meta.providerId || this.lastUsedModel?.providerId,
                };
              }
              if (meta.accountId) {
                this.lastUsedAccount = { id: meta.accountId };
              }
            },
            onContinuing: (isContinuing) => {
              this.setContinuing(isContinuing);
            },
            onRawContent: () => {
              // No-op in CLI — streaming preview handled by Ink components
            },
            onContent: (streamContent) => {
              let finalContent = streamContent;
              if (finalModel?.providerId === "claude") {
                const processed = processClaudeContent(
                  streamContent,
                  this.config.workspacePath,
                );
                finalContent = processed.content;
              }
              claudeParsedContent = finalContent;

              // Update assistant message in-place
              this.messages = this.messages.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: finalContent, thinking: undefined }
                  : m,
              );
              this.emit("messagesUpdated", this.messages);
            },
          },
        );

      // Merge final message
      assistantMessage.id = assistantMessageId;

      if (claudeParsedContent) {
        assistantMessage.content = claudeParsedContent;
        assistantMessage.rawResponse = assistantMessage.thinking
          ? `${assistantMessage.thinking}\n\n${claudeParsedContent}`
          : claudeParsedContent;
      }

      // Store backend conversation ID
      if (backendConversationId) {
        this.backendConversationId = backendConversationId;
      }

      // Copy metadata from user message to assistant message
      assistantMessage.providerId =
        userMessage.providerId || finalModel?.providerId;
      assistantMessage.modelId = userMessage.modelId || finalModel?.id;
      assistantMessage.accountId = userMessage.accountId || finalAccount?.id;

      // Final state update
      this.messages = [...updatedMessages, assistantMessage];
      this.emit("messagesUpdated", this.messages);
      this.setProcessing(false);
      this.setStreaming(false);
      this.abortController = null;

      // Parse response
      let parsed: ParsedResponse | null = null;
      let hasParsingError = false;

      try {
        const contentToParse =
          assistantMessage.rawResponse || assistantMessage.content;
        parsed = parseAIResponse(contentToParse);
        assistantMessage.parsed = parsed;

        // Update with parsed data
        this.messages = this.messages.map((m) =>
          m.id === assistantMessageId ? { ...m, parsed } : m,
        );
        this.emit("messagesUpdated", this.messages);
      } catch (parseError) {
        hasParsingError = true;
        const errorDetails =
          parseError instanceof Error
            ? parseError.message
            : "Unknown parsing error";
        assistantMessage.content = `Error: Failed to parse response\n\nDetails: ${errorDetails}`;
        assistantMessage.isError = true;
        this.messages = this.messages.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: assistantMessage.content, isError: true }
            : m,
        );
        this.emit("messagesUpdated", this.messages);
      }

      // Detect only-thinking response
      if (!hasParsingError && parsed?.onlyThinkingDetected) {
        return;
      }

      // Trigger tool request
      if (!hasParsingError && parsed && parsed.actions?.length > 0) {
        const isClaudeConversation =
          assistantMessage.providerId === "claude" ||
          this.lastUsedModel?.providerId === "claude";

        const CLAUDE_EXECUTABLE_TOOLS = new Set([
          "write_to_file",
          "replace_in_file",
        ]);

        const executableActions = isClaudeConversation
          ? parsed.actions.filter((a: ToolAction) =>
              CLAUDE_EXECUTABLE_TOOLS.has(a.type),
            )
          : parsed.actions;

        if (executableActions.length > 0) {
          this.emit("toolRequest", executableActions, assistantMessage);
        }
      }
    } catch (error) {
      this.setStreaming(false);
      this.abortController = null;

      if (error instanceof Error && error.name === "AbortError") {
        this.setProcessing(false);
        return;
      }

      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        timestamp: Date.now(),
        isError: true,
      };

      this.messages = [
        ...this.messages.filter((m) => !m.isCancelled),
        errorMessage,
      ];
      this.emit("messagesUpdated", this.messages);
      this.setProcessing(false);
      this.emit(
        "error",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // ─── Handle Select Option ─────────────────────────────────────────────

  handleSelectOption(messageId: string, option: string): void {
    if (this._isProcessing) return;

    let updatedMessages = this.messages.map((m) =>
      m.id === messageId ? { ...m, selectedOption: option } : m,
    );

    let parsedPayload: {
      allAnswered?: boolean;
      answers?: Record<string, any>;
      questions?: any[];
    } | null = null;

    try {
      const parsed = JSON.parse(option);
      if (parsed.allAnswered === true && parsed.answers) {
        parsedPayload = parsed;
      }
    } catch {
      // Not JSON — legacy single option
    }

    if (!this.currentConversationId) {
      this.currentConversationId = crypto.randomUUID();
      this.emit("conversationIdChanged", this.currentConversationId);
    }

    this.messages = updatedMessages;
    this.emit("messagesUpdated", updatedMessages);

    if (parsedPayload?.answers) {
      if (this._isProcessing) return;

      setTimeout(() => {
        if (this._isProcessing) return;

        const questions = parsedPayload!.questions || [];
        const answers = parsedPayload!.answers || {};

        const formattedAnswers = questions
          .map((question: any, index: number) => {
            const qId = question.id;
            const answer = answers[qId];
            const number = index + 1;
            if (!answer || (answer.value !== false && !answer.value)) {
              return `${number}. `;
            }
            if (typeof answer.value === "boolean") {
              return `${number}. ${answer.value ? "Yes" : "No"}`;
            }
            const value = Array.isArray(answer.value)
              ? answer.value.join(", ")
              : String(answer.value);
            return `${number}. ${value}`;
          })
          .join("\n");

        const promptText = `<question-answer>\n${formattedAnswers}\n</question-answer>`;
        this.sendMessage({
          content: promptText,
          skipFirstRequestLogic: true,
          uiHidden: true,
        });
      }, 100);
    }
  }

  // ─── Private State Setters ────────────────────────────────────────────

  private setProcessing(val: boolean): void {
    this._isProcessing = val;
    this.emit("processingChanged", val);
  }

  private setStreaming(val: boolean): void {
    this._isStreaming = val;
    this.emit("streamingChanged", val);
  }

  private setContinuing(val: boolean): void {
    this._isContinuing = val;
    this.emit("continuingChanged", val);
  }
}
