/**
 * useChat — Thin React hook wrapper around ChatService.
 * Bridges ChatService events to React state for Ink components.
 *
 * This hook is intentionally minimal: all business logic lives in ChatService.
 * The hook only manages React state synchronization and lifecycle.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChatService } from "../services/ChatService";
import type { RuntimeFlags } from "../services/ChatService";
import type { Message } from "../types/message";
import type { SendMessageOptions } from "../services/ChatService";

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

export function useChat(config: UseChatConfig): UseChatReturn {
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

  // React state mirrors
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [isProcessing, setIsProcessingState] = useState(false);
  const [isStreaming, setIsStreamingState] = useState(false);
  const [isContinuing, setIsContinuingState] = useState(false);
  const [currentConversationId, setCurrentConversationIdState] = useState("");

  // Sync service → React state via events
  useEffect(() => {
    const onMessagesUpdated = (msgs: Message[]) => setMessagesState(msgs);
    const onProcessingChanged = (val: boolean) => setIsProcessingState(val);
    const onStreamingChanged = (val: boolean) => setIsStreamingState(val);
    const onContinuingChanged = (val: boolean) => setIsContinuingState(val);
    const onConversationIdChanged = (id: string) =>
      setCurrentConversationIdState(id);

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
