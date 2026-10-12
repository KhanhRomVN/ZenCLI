/**
 * ------------------------------------------------------------------
 * useChat Hook
 * ------------------------------------------------------------------
 * Cầu nối mỏng (Thin Wrapper) giữa lớp Business Logic (ChatService) và Giao diện React (Ink).
 * Chịu trách nhiệm đồng bộ hóa trạng thái sự kiện (Event-driven) sang State của React.
 *
 * Main features:
 * - Khởi tạo singleton ChatService & ToolExecutionService ổn định suốt vòng đời component
 * - Lắng nghe các sự kiện cập nhật tin nhắn, trạng thái streaming/processing từ Service
 * - Cung cấp API thuần túy để Component cha điều khiển luồng chat (send, stop, reset)
 * - Tự động gắn kết vòng lặp thực thi Tool tự động (Auto-tool loop) khi cần thiết
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── Services ──
import { ChatService } from "../services/ChatService.js";
import type { RuntimeFlags } from "../services/ChatService.js";
import { ToolExecutionService } from "../services/ToolExecutionService.js";

// ── Types ──
import type { Message } from "../types/message.js";
import type { SendMessageOptions } from "../services/ChatService.js";

// ─── Interfaces ────────────────────────────────────────────────────────
export interface UseChatConfig {
  apiUrl: string;
  workspacePath: string;
  aiLanguage?: string;
  permissionMode?: string;
  /** Getter trả về runtime flags hiện tại — gọi mỗi lần build system prompt.
   *  Optional: nếu không truyền, ChatService sẽ không gửi system prompt. */
  getRuntimeFlags?: () => RuntimeFlags | undefined;
}

export interface UseChatReturn {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  isStreaming: boolean;
  isContinuing: boolean;
  currentConversationId: string;
  setCurrentConversationId: (id: string) => void;
  sendMessage: (options: SendMessageOptions) => Promise<void>;
  stopGeneration: () => void;
  resetSession: () => void;
  handleSelectOption: (messageId: string, option: string) => void;
  chatService: ChatService;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useChat(config: UseChatConfig): UseChatReturn {
  // ── Refs ──
  // Keep latest getRuntimeFlags in a ref so the stable ChatService instance
  // always reads current values without needing re-instantiation.
  const getRuntimeFlagsRef = useRef(config.getRuntimeFlags);
  getRuntimeFlagsRef.current = config.getRuntimeFlags;

  // Create stable ChatService instance
  const serviceRef = useRef<ChatService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new ChatService({
      apiUrl: config.apiUrl,
      workspacePath: config.workspacePath,
      aiLanguage: config.aiLanguage || "vi",
      permissionMode: config.permissionMode || "fullAccess",
      getRuntimeFlags: () => {
        const fn = getRuntimeFlagsRef.current;
        return fn ? fn() : undefined;
      },
    });
  }
  const chatService = serviceRef.current;

  // Create stable ToolExecutionService instance — wires the auto-loop between
  // ChatService's "toolRequest" event and executor dispatch.
  const toolExecRef = useRef<ToolExecutionService | null>(null);
  if (!toolExecRef.current) {
    toolExecRef.current = new ToolExecutionService({
      workspacePath: config.workspacePath,
      sendMessage: (opts) => chatService.sendMessage(opts),
      getMessages: () => chatService.getMessages(),
      setMessages: (msgs) => chatService.setMessages(msgs),
    });
  }
  const toolExecutionService = toolExecRef.current;

  // ── State ──
  // React state mirrors
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [isProcessing, setIsProcessingState] = useState(false);
  const [isStreaming, setIsStreamingState] = useState(false);
  const [isContinuing, setIsContinuingState] = useState(false);
  const [currentConversationId, setCurrentConversationIdState] = useState("");

  // ── Effects ─
  // Attach/detach the toolRequest listener on mount/unmount.
  useEffect(() => {
    const detach = toolExecutionService.attach(chatService);
    return detach;
  }, [chatService, toolExecutionService]);

  // Reset internal tool-execution bookkeeping whenever a new session starts
  // (detected by conversationId becoming empty AND no messages left).
  useEffect(() => {
    if (!currentConversationId && messages.length === 0) {
      toolExecutionService.reset();
    }
  }, [currentConversationId, messages.length, toolExecutionService]);

  // Sync service → React state via events
  useEffect(() => {
    const onMessagesUpdated = (msgs: Message[]) => setMessagesState(msgs);
    const onProcessingChanged = (val: boolean) => setIsProcessingState(val);
    const onStreamingChanged = (val: boolean) => setIsStreamingState(val);
    const onContinuingChanged = (val: boolean) => setIsContinuingState(val);
    const onConversationIdChanged = (id: string) => {
      setCurrentConversationIdState(id);
      
      // ── NEW: Emit bind signal to stderr for Phantoma integration ──
      // Format: [PHANTOMA_BIND] id=<uuid>
      // Phantoma parses this from PTY output to auto-bind conversation ID to terminal panel.
      if (id) {
        process.stderr.write(`\x1b[0m[PHANTOMA_BIND] id=${id}\n`);
      } else {
        // When session resets, notify Phantoma to clear binding
        process.stderr.write(`\x1b[0m[PHANTOMA_UNBIND]\n`);
      }
    };

    chatService.on("messagesUpdated", onMessagesUpdated);
    chatService.on("processingChanged", onProcessingChanged);
    chatService.on("streamingChanged", onStreamingChanged);
    chatService.on("continuingChanged", onContinuingChanged);
    chatService.on("conversationIdChanged", onConversationIdChanged);

    return () => {
      chatService.off("messagesUpdated", onMessagesUpdated);
      chatService.off("processingChanged", onProcessingChanged);
      chatService.off("streamingChanged", onStreamingChanged);
      chatService.off("continuingChanged", onContinuingChanged);
      chatService.off("conversationIdChanged", onConversationIdChanged);
    };
  }, [chatService]);

  // Update service config when props change
  useEffect(() => {
    chatService.setConfig({
      apiUrl: config.apiUrl,
      workspacePath: config.workspacePath,
      aiLanguage: config.aiLanguage,
      permissionMode: config.permissionMode,
    });
  }, [
    config.apiUrl,
    config.workspacePath,
    config.aiLanguage,
    config.permissionMode,
    chatService,
  ]);

  // ── Callbacks ──
  // Wrapped methods
  const setMessages = useCallback(
    (msgs: Message[]) => {
      chatService.setMessages(msgs);
    },
    [chatService],
  );

  const setIsProcessing = useCallback((val: boolean) => {
    // Direct state update for external control (e.g., tool execution)
    setIsProcessingState(val);
  }, []);

  const sendMessage = useCallback(
    async (options: SendMessageOptions) => {
      await chatService.sendMessage(options);
    },
    [chatService],
  );

  const stopGeneration = useCallback(() => {
    chatService.stopGeneration();
  }, [chatService]);

  const resetSession = useCallback(() => {
    chatService.resetSession();
  }, [chatService]);

  const setCurrentConversationId = useCallback((id: string) => {
    // For external setting (e.g., loading conversation from history)
    setCurrentConversationIdState(id);
  }, []);

  const handleSelectOption = useCallback(
    (messageId: string, option: string) => {
      chatService.handleSelectOption(messageId, option);
    },
    [chatService],
  );

  return useMemo(
    () => ({
      messages,
      setMessages,
      isProcessing,
      setIsProcessing,
      isStreaming,
      isContinuing,
      currentConversationId,
      setCurrentConversationId,
      sendMessage,
      stopGeneration,
      resetSession,
      handleSelectOption,
      chatService,
    }),
    [
      messages,
      setMessages,
      isProcessing,
      setIsProcessing,
      isStreaming,
      isContinuing,
      currentConversationId,
      setCurrentConversationId,
      sendMessage,
      stopGeneration,
      resetSession,
      handleSelectOption,
      chatService,
    ],
  );
}
