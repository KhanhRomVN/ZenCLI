import React, { useEffect, useCallback, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useChat } from "../../hooks/useChat";
import type { RuntimeFlags } from "../../services/ChatService";
import { ToolRenderer } from "./ToolRenderer";
import { WelcomeSection } from "./WelcomeSection";
import { ModelAccount } from "../ModelAccount";
import { saveSelection, loadSelection } from "../../services/selectionStorage";
import { getApiUrl, logToFile } from "../../services/api";

/**
 * Strip the CLI prompt wrapper from a user message so the UI shows only
 * the raw text the user typed, not `## User Message\n<user-message>...`.
 */
function extractUserVisibleContent(raw: string): string {
  const match = /<user-message>\s*([\s\S]*?)\s*<\/user-message>/i.exec(raw);
  if (match) return match[1].trim();
  // Fallback: remove leading "## User Message" header if present
  return raw.replace(/^##\s*User Message\s*/i, "").trim();
}

interface ChatProps {
  /** Whether this panel is currently the active (visible) panel */
  isActive: boolean;
  /** Callback to expose handlers to parent (App) for slash command routing */
  onHandlersReady?: (handlers: {
    handleSubmit: (value: string) => void;
    handleLoadConversation: (conversationId: string) => void;
    handleModelSelect: (selection: {
      providerId: string;
      modelId: string;
      accountId?: string;
    }) => void;
    handleResetSession: () => void;
  }) => void;
  /** Notify parent with current model/account status and details */
  onModelAccountStatusChange?: (status: {
    hasModelAndAccount: boolean;
    providerName: string;
    modelName: string;
    email: string;
  }) => void;
  /** Notify parent when inline panel is open (to hide TextInput) */
  onInlinePanelChange?: (isOpen: boolean) => void;
  /** Getter trả về runtime flags hiện tại từ App — gọi mỗi lần build system prompt.
   *  Optional: nếu không truyền, ChatService sẽ không gửi system prompt. */
  getRuntimeFlags?: () => RuntimeFlags | undefined;
}

/**
 * Main chat panel — displays welcome banner and message list.
 * Uses ChatService via useChat hook for all business logic.
 *
 * TextInput is NOT here — it lives in App.tsx.
 * This component only renders the content area above the input.
 *
 * /model-account renders as an inline interactive panel within the
 * message list, styled like ToolRenderer output.
 */
export function Chat({
  isActive,
  onHandlersReady,
  onModelAccountStatusChange,
  onInlinePanelChange,
  getRuntimeFlags,
}: ChatProps): React.JSX.Element {
  const workspacePath = process.cwd();

  const { messages, sendMessage, resetSession, chatService } = useChat({
    apiUrl: getApiUrl(),
    workspacePath,
    getRuntimeFlags,
  });

  // Track which user message triggered /model-account (by message id)
  const [modelAccountMessageId, setModelAccountMessageId] = useState<string | null>(null);

  // Ref mirror for synchronous duplicate prevention (state is async in React)
  const modelAccountMessageIdRef = useRef<string | null>(null);

  // Completed selection results keyed by messageId — preserves feedback for every trigger
  const [completedSelections, setCompletedSelections] = useState<
    Map<string, {
      providerId: string;
      modelId: string;
      accountId?: string;
      email?: string;
      cancelled?: boolean;
    }>
  >(new Map());

  // Keep ref in sync with state
  useEffect(() => {
    modelAccountMessageIdRef.current = modelAccountMessageId;
  }, [modelAccountMessageId]);

  // Notify parent when inline panel opens/closes
  useEffect(() => {
    onInlinePanelChange?.(modelAccountMessageId !== null);
  }, [modelAccountMessageId, onInlinePanelChange]);

  // Track model/account info for header display — refresh when messages change
  const [headerInfo, setHeaderInfo] = useState<{
    providerName: string;
    modelName: string;
    email: string;
  }>({ providerName: "-", modelName: "-", email: "-" });

  // Auto-load saved selection for current project on mount
  useEffect(() => {
    const saved = loadSelection();
    if (saved) {
      // Update chatService so subsequent sendMessage uses saved model/account
      chatService.setLastUsedModel({
        id: saved.modelId,
        providerId: saved.providerId,
      });
      chatService.setLastUsedAccount({
        id: saved.accountId || "",
        email: saved.email,
      });
      const newHeader = {
        providerName: saved.providerId,
        modelName: saved.modelId,
        email: saved.email || "-",
      };
      setHeaderInfo(newHeader);
      onModelAccountStatusChange?.({
        hasModelAndAccount: !!(saved.modelId && saved.accountId),
        ...newHeader,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Removed useEffect listening to 'messages' for header info update.
  // This was causing header to reset incorrectly when /new cleared messages.
  // Header info is now managed by:
  // 1. Initial mount load (see above useEffect [])
  // 2. handleModelSelect (updates state directly)
  // 3. handleLoadConversation (can trigger reload if needed)

  // Allow Enter on header to open model-account panel inline
  const [headerFocusLine, setHeaderFocusLine] = useState(0);
  useInput((input, key) => {
    if (!isActive || messages.length !== 0) return;
    if (key.upArrow) {
      setHeaderFocusLine((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setHeaderFocusLine((prev) => Math.min(1, prev + 1));
    } else if (key.return && headerFocusLine === 0) {
      handleSubmit("/model-account");
    }
  });

  // Expose handlers to parent for slash command routing
  const handleSubmit = useCallback(
    (value: string): void => {
      const trimmed = value.trim();

      // Intercept /model-account: create user message + activate inline panel
      if (trimmed.toLowerCase() === "/model-account") {
        // Synchronous duplicate prevention via ref (state updates are async)
        if (modelAccountMessageIdRef.current) return;

        const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-ma`;
        modelAccountMessageIdRef.current = msgId;

        const userMsg = {
          id: msgId,
          role: "user" as const,
          content: "/model-account",
          timestamp: Date.now(),
          token_usage: 0,
        };
        const currentMessages = chatService.getMessages();
        chatService.setMessages([...currentMessages, userMsg]);
        setModelAccountMessageId(msgId);
        // Không reset completedSelection — giữ lại feedback của các lần trigger trước
        return;
      }

      // Force close inline ModelAccount panel if it's still open before sending a regular message
      if (modelAccountMessageIdRef.current) {
        modelAccountMessageIdRef.current = null;
        setModelAccountMessageId(null);
      }

      sendMessage({ content: trimmed });
    },
    [sendMessage, chatService],
  );

  const handleLoadConversation = useCallback(
    (conversationId: string): void => {
      resetSession();
      chatService.setMessages([
        {
          id: `msg-${Date.now()}-system`,
          role: "assistant",
          content: `(Loaded conversation: ${conversationId})`,
          timestamp: Date.now(),
        },
      ]);
    },
    [resetSession, chatService],
  );

  const handleModelSelect = useCallback(
    (selection: {
      providerId: string;
      modelId: string;
      accountId?: string;
      email?: string;
    }): void => {
      // Persist selection per-project for auto-load on next launch
      saveSelection({
        providerId: selection.providerId,
        modelId: selection.modelId,
        accountId: selection.accountId,
        email: selection.email,
      });

      // Update local header info immediately for instant UI feedback
      const newHeader = {
        providerName: selection.providerId,
        modelName: selection.modelId,
        email: selection.email || "-",
      };
      setHeaderInfo(newHeader);
      
      // Notify parent with full details
      onModelAccountStatusChange?.({
        hasModelAndAccount: true,
        ...newHeader,
      });

      // Close inline panel and show completion result
      if (modelAccountMessageIdRef.current) {
        setCompletedSelections((prev) => {
          const next = new Map(prev);
          next.set(modelAccountMessageIdRef.current!, selection);
          return next;
        });
      }
      modelAccountMessageIdRef.current = null;
      setModelAccountMessageId(null);
    },
    [chatService, onModelAccountStatusChange],
  );

  // Register handlers with parent on mount
  const handlersRef = useRef({
    handleSubmit,
    handleLoadConversation,
    handleModelSelect,
    handleResetSession: resetSession,
  });

  // Keep ref in sync when callbacks change
  useEffect(() => {
    handlersRef.current = {
      handleSubmit,
      handleLoadConversation,
      handleModelSelect,
      handleResetSession: resetSession,
    };
  }, [handleSubmit, handleLoadConversation, handleModelSelect, resetSession]);

  // Notify parent when handlers are ready
  useEffect(() => {
    onHandlersReady?.(handlersRef.current);
  }, [onHandlersReady]);

  // Determine if we should show welcome section
  // Hide as soon as ANY message exists (user or assistant) to keep UI clean
  // and prevent layout overflow that pushes TextInput out of view.
  const hasAnyMessages = messages.filter(m => !m.uiHidden).length > 0;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Welcome section — ALWAYS visible at the top of the chat area */}
      <WelcomeSection
        providerName={headerInfo.providerName}
        modelName={headerInfo.modelName}
        email={headerInfo.email}
        workspacePath={workspacePath}
      />

      {/* Message list */}
      {messages.length > 0 && (
        <Box flexDirection="column">
          {messages.map((msg, i) => {
            if (msg.uiHidden) return null;

            // Check if this user message triggered /model-account
            const isModelAccountTrigger = msg.id === modelAccountMessageId;
            const selectionResult = completedSelections.get(msg.id);
            const completedForThisMsg = !!selectionResult;

            return (
              <Box key={msg.id || i} flexDirection="column" marginBottom={1}>
                {msg.role === "user" ? (
                  <Box flexDirection="column">
                    {(() => {
                      let visibleContent = "";
                      try {
                        visibleContent = extractUserVisibleContent(msg.content);
                      } catch (e) {
                        visibleContent = msg.content; // Fallback to raw content if extraction fails
                      }
                      
                      // Show user message with background ONLY covering the text length
                      return (
                        <Box flexDirection="row">
                          <Text backgroundColor="#2a2a2a">
                            <Text color="white">{"❯ "}</Text>
                            <Text>{visibleContent}</Text>
                          </Text>
                        </Box>
                      );
                    })()}
                    {/* Completed selection result — styled like ToolRenderer */}
                    {completedForThisMsg && selectionResult && (
                      <Box flexDirection="column" marginTop={0} marginBottom={0}>
                        {selectionResult.cancelled ? (
                          <Box paddingLeft={2}>
                            <Text dimColor>{"⎿  "}</Text>
                            <Text color="yellow">Cancelled — no provider/model selected.</Text>
                          </Box>
                        ) : (
                          <Box paddingLeft={2}>
                            <Text dimColor>{"⎿  "}</Text>
                            <Text>
                              Select {selectionResult.providerId}/{selectionResult.modelId}
                              {selectionResult.email ? ` ${selectionResult.email}` : ""} successfully!
                            </Text>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : msg.isError ? (
                  <Text color="red">{msg.content}</Text>
                ) : (
                  <Box flexDirection="column">
                    {msg.thinking && (
                      <Box flexDirection="column" marginBottom={0}>
                        <Text dimColor italic>
                          {"  ⎿ Thinking..."}
                        </Text>
                      </Box>
                    )}
                    
                    {/* Render structured content blocks safely */}
                    {(() => {
                      const blocks = msg.parsed?.contentBlocks;
                      const hasBlocks = Array.isArray(blocks) && blocks.length > 0;
                      
                      if (hasBlocks) {
                        return (
                          <Box flexDirection="column">
                            {blocks.map((block: any, blockIdx: number) => {
                              try {
                                if (block.type === "markdown" && typeof block.content === "string") {
                                  return (
                                    <Box key={`md-${blockIdx}`} flexDirection="row">
                                      <Text>{"● "}</Text>
                                      <Box flexDirection="column">
                                        {block.content.split("\n").map((line: string, lineIdx: number) => (
                                          <Text key={lineIdx}>{line}</Text>
                                        ))}
                                      </Box>
                                    </Box>
                                  );
                                } else if (block.type === "code" && typeof block.content === "string") {
                                  return (
                                    <Box key={`code-${blockIdx}`} flexDirection="column">
                                      <Text dimColor>{`\`\`${block.language || ""}`}</Text>
                                      {block.content.split("\n").map((line: string, lineIdx: number) => (
                                        <Text key={lineIdx}>{line}</Text>
                                      ))}
                                      <Text dimColor>{"\`\`"}</Text>
                                    </Box>
                                  );
                                }
                              } catch (e) {
                                // Silently skip malformed blocks to prevent UI crash
                                console.error("Render block error:", e);
                              }
                              return null;
                            })}
                            
                            {/* Render tools/actions */}
                            {msg.parsed?.actions && msg.parsed.actions.length > 0 && (
                              <Box flexDirection="column" marginTop={0}>
                                {msg.parsed.actions.map(
                                  (action: any, actionIdx: number) => (
                                    <ToolRenderer
                                      key={`${msg.id}-action-${actionIdx}`}
                                      action={action}
                                      actionIndex={actionIdx}
                                      messageId={msg.id || String(i)}
                                      isActionClicked={true}
                                      toolOutputs={(msg as any).toolOutputs}
                                    />
                                  ),
                                )}
                              </Box>
                            )}
                          </Box>
                        );
                      } else {
                        // Fallback: Show raw content if parsing hasn't finished or failed
                        return (
                          <Box flexDirection="column">
                            {msg.content && msg.content.trim().length > 0 && (
                              <Box flexDirection="row">
                                <Text>{"● "}</Text>
                                <Text>{msg.content}</Text>
                              </Box>
                            )}
                            {msg.parsed?.actions && msg.parsed.actions.length > 0 && (
                              <Box flexDirection="column" marginTop={0}>
                                {msg.parsed.actions.map(
                                  (action: any, actionIdx: number) => (
                                    <ToolRenderer
                                      key={`${msg.id}-action-${actionIdx}`}
                                      action={action}
                                      actionIndex={actionIdx}
                                      messageId={msg.id || String(i)}
                                      isActionClicked={true}
                                      toolOutputs={(msg as any).toolOutputs}
                                    />
                                  ),
                                )}
                              </Box>
                            )}
                          </Box>
                        );
                      }
                    })()}
{/* Timestamp removed */}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Inline ModelAccount Panel — Rendered AFTER messages to appear below the trigger command */}
      {modelAccountMessageId !== null && !completedSelections.has(modelAccountMessageId) && (
        <Box flexDirection="column" paddingLeft={2}>
          <Text dimColor>{"⎿ Selecting provider/model/account..."}</Text>
          <ModelAccount
            isOpen={true}
            onClose={() => {
              // User cancelled without selecting — show cancellation feedback
              if (modelAccountMessageIdRef.current) {
                setCompletedSelections((prev) => {
                  const next = new Map(prev);
                  next.set(modelAccountMessageIdRef.current!, {
                    providerId: "",
                    modelId: "",
                    cancelled: true,
                  });
                  return next;
                });
              }
              modelAccountMessageIdRef.current = null;
              setModelAccountMessageId(null);
            }}
            onSelect={handleModelSelect}
          />
        </Box>
      )}
    </Box>
  );
}