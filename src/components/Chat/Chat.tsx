import React, { useEffect, useCallback, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useChat } from "../../hooks/useChat";
import { ToolRenderer } from "./ToolRenderer";
import { getApiUrl } from "../../services/api";

import { readFileSync } from "fs";
import { resolve } from "path";

const pkgVersion: string = (() => {
  try {
    const pkgPath = resolve(__dirname, "../../../package.json");
    return JSON.parse(readFileSync(pkgPath, "utf-8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

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
  /** Notify parent whether a model + account has been selected */
  onModelAccountStatusChange?: (hasModelAndAccount: boolean) => void;
}

/**
 * Main chat panel — displays welcome banner and message list.
 * Uses ChatService via useChat hook for all business logic.
 *
 * TextInput is NOT here — it lives in App.tsx (always visible).
 * This component only renders the content area above the input.
 */
export function Chat({
  isActive,
  onHandlersReady,
  onModelAccountStatusChange,
}: ChatProps): React.JSX.Element {
  const workspacePath = process.cwd();

  const { messages, sendMessage, resetSession, chatService } = useChat({
    apiUrl: getApiUrl(),
    workspacePath,
  });

  // Track model/account info for header display — refresh when messages change
  const [headerInfo, setHeaderInfo] = useState<{
    providerName: string;
    modelName: string;
    email: string;
  }>({ providerName: "-", modelName: "-", email: "-" });

  useEffect(() => {
    const model = chatService.getLastUsedModel();
    const account = chatService.getLastUsedAccount();
    const hasModelAndAccount = !!(model?.id && account);
    setHeaderInfo({
      providerName: model?.providerId || "-",
      modelName: model?.id || "-",
      email:
        (account as any)?.email || (account?.id ? String(account.id) : "-"),
    });
    onModelAccountStatusChange?.(hasModelAndAccount);
  }, [messages, chatService, onModelAccountStatusChange]);

  // Allow Enter on header line 2 to open model-account panel
  const [headerFocusLine, setHeaderFocusLine] = useState(0);
  useInput((input, key) => {
    if (messages.length !== 0) return;
    if (key.upArrow) {
      setHeaderFocusLine((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setHeaderFocusLine((prev) => Math.min(1, prev + 1));
    } else if (key.return && headerFocusLine === 0) {
      // Trigger model-account panel via slash command
      handleSubmit("/model-account");
    }
  });

  // Expose handlers to parent for slash command routing
  const handleSubmit = useCallback(
    (value: string): void => {
      sendMessage({ content: value });
    },
    [sendMessage],
  );

  const handleLoadConversation = useCallback(
    (conversationId: string): void => {
      // TODO: Load conversation messages from filesystem via GlobalStorageManager
      resetSession();
      // Placeholder: append a system message indicating loaded conversation
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
    }): void => {
      // Append confirmation message to chat timeline
      const confirmMsg = `Selected: ${selection.providerId}/${selection.modelId}${selection.accountId ? ` (account: ${selection.accountId})` : ""}`;
      const currentMessages = chatService.getMessages();
      chatService.setMessages([
        ...currentMessages,
        {
          id: `msg-${Date.now()}-system`,
          role: "assistant",
          content: confirmMsg,
          timestamp: Date.now(),
        },
      ]);
    },
    [chatService],
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

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Welcome section — ASCII art header with model info */}
      {messages.length === 0 &&
        (() => {
          const hasSelection = headerInfo.modelName !== "-" && headerInfo.email !== "-";
          const line2 = hasSelection
            ? `${headerInfo.providerName} | ${headerInfo.modelName} | ${headerInfo.email}`
            : "Select a model & account to start chatting (/model-account)";
          // Convert absolute path to ~/<relative> format
          const homeDir = process.env.HOME || process.env.USERPROFILE || "";
          const projectPath =
            homeDir && workspacePath.startsWith(homeDir)
              ? "~" + workspacePath.slice(homeDir.length)
              : workspacePath;
          const secondaryColor = "gray";
          return (
            <Box flexDirection="column" paddingX={1} marginBottom={1}>
              <Text>
                <Text color="yellow">
                  {"  ▄▄████▄▄    "}
                </Text>
                <Text bold color="white">
                  Zen
                </Text>
                <Text color={secondaryColor}>{` v${pkgVersion}`}</Text>
              </Text>
              <Text>
                <Text color="yellow">{" █▀ "}</Text>
                <Text color="cyan">{"▄▄▄▄"}</Text>
                <Text color="yellow">{" ▀█   "}</Text>
                <Text color={secondaryColor}>{line2}</Text>
              </Text>
              <Text>
                <Text color="yellow">{"██ "}</Text>
                <Text color="cyan">{"█    █"}</Text>
                <Text color="yellow">{" ██  "}</Text>
                <Text color={secondaryColor}>{projectPath}</Text>
              </Text>
              <Text>
                <Text color="yellow">{" █▄ "}</Text>
                <Text color="cyan">{"▀▀▀▀"}</Text>
                <Text color="yellow">{" ▄█   "}</Text>
              </Text>
              <Text color="yellow">{"  ▀▀████▀▀    "}</Text>
            </Box>
          );
        })()}

      {/* Message list */}
      {messages.length > 0 && (
        <Box flexDirection="column" paddingX={1}>
          {messages.map((msg, i) => {
            // Skip UI-hidden messages (tool results sent back to LLM)
            if (msg.uiHidden) return null;

            return (
              <Box key={msg.id || i} flexDirection="column" marginBottom={0}>
                {msg.role === "user" ? (
                  <Box>
                    <Text color="cyan">{"❯ "}</Text>
                    <Text>{msg.content}</Text>
                  </Box>
                ) : msg.isError ? (
                  <Text color="red">{msg.content}</Text>
                ) : (
                  <Box flexDirection="column">
                    {/* Show thinking block if present */}
                    {msg.thinking && (
                      <Box flexDirection="column" marginBottom={0}>
                        <Text dimColor italic>
                          {"  ⎿ Thinking..."}
                        </Text>
                      </Box>
                    )}
                    {/* Main content */}
                    <Box flexDirection="column">
                      <Text>
                        {"  "}
                        {msg.content}
                      </Text>
                    </Box>
                    {/* Render each tool action with unified TUI format */}
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
                    {/* Metadata bar */}
                    {(msg.usage || msg.timestamp) && (
                      <Box marginTop={0}>
                        <Text dimColor>
                          {"✻ "}
                          {msg.usage?.total_tokens
                            ? `${msg.usage.total_tokens} tokens · `
                            : ""}
                          {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
