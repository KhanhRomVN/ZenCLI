import React, { useEffect, useCallback, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useChat } from "../../hooks/useChat";
import type { RuntimeFlags } from "../../services/ChatService";
import { ToolRenderer } from "./ToolRenderer";
import { WelcomeSection } from "./WelcomeSection";
import { CommandPanel } from "../CommandPanel";
import { ModelAccount } from "../ModelAccount";
import { History } from "../History";
import { Settings } from "../Settings";
import { Account } from "../Account";
import { PromptConfig } from "../PromptConfig";
import { Analytic } from "../Analytic";
import { saveSelection, loadSelection } from "../../services/selectionStorage";
import { getApiUrl, logToFile } from "../../services/api";

// ─── Spinner icon cycle (standard braille dots animation, U+2800 block) ──
const SPINNER_FRAMES = [
  "\u280B", // ⠋
  "\u2819", // ⠙
  "\u2839", // ⠹
  "\u2838", // ⠸
  "\u283C", // ⠼
  "\u2834", // ⠴
  "\u2826", // ⠦
  "\u2827", // ⠧
  "\u2807", // ⠇
  "\u280F", // ⠏
];
/**
 * Live elapsed-time indicator shown while waiting for an AI response.
 * Renders nothing once `active` flips to false so it disappears cleanly
 * the moment the assistant message arrives.
 */
function GeneratingIndicator({ active }: { active: boolean }): React.JSX.Element | null {
  const [elapsed, setElapsed] = useState(0);
  const [frameIdx, setFrameIdx] = useState(0);
  const startRef = useRef<number>(Date.now());

  // Reset timer whenever the indicator becomes newly active
  useEffect(() => {
    if (active) {
      startRef.current = Date.now();
      setElapsed(0);
    }
  }, [active]);

  // Tick every 100ms: update seconds counter + rotate spinner frame
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      setFrameIdx((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 100);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const icon = SPINNER_FRAMES[frameIdx];
  return (
    <Box>
      <Text color="cyan">{`${icon} `}</Text>
      <Text dimColor>{`Generate response for ${elapsed}s...`}</Text>
    </Box>
  );
}

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
  /** Notify parent with current context usage (total tokens) */
  onContextUsageChange?: (usage: { prompt: number; completion: number; total: number }) => void;
  /** Getter trả về runtime flags hiện tại từ App — gọi mỗi lần build system prompt.
   *  Optional: nếu không truyền, ChatService sẽ không gửi system prompt. */
  getRuntimeFlags?: () => RuntimeFlags | undefined;
  
  // New props for unified command panels
  promptLength: 'none' | 'short' | 'medium' | 'long';
  codeStyle: 'standard' | 'functional' | 'oop';
  diagnosticsEnabled: boolean;
  skillsEnabled: boolean;
  onSetPromptLength: (val: 'none' | 'short' | 'medium' | 'long') => void;
  onSetCodeStyle: (val: 'standard' | 'functional' | 'oop') => void;
  onToggleDiagnostic: () => void;
  onToggleSkill: () => void;
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
  onContextUsageChange,
  getRuntimeFlags,
  promptLength,
  codeStyle,
  diagnosticsEnabled,
  skillsEnabled,
  onSetPromptLength,
  onSetCodeStyle,
  onToggleDiagnostic,
  onToggleSkill,
}: ChatProps): React.JSX.Element {
  const workspacePath = process.cwd();

  const { messages, sendMessage, resetSession, chatService, isStreaming } = useChat({
    apiUrl: getApiUrl(),
    workspacePath,
    getRuntimeFlags,
  });

  type ActiveCommand = "none" | "model-account" | "history" | "settings" | "account" | "prompt-config" | "analytic";

  // Track which user message triggered a command (by message id)
  const [activeCommandMsgId, setActiveCommandMsgId] = useState<string | null>(null);
  const [activeCommandType, setActiveCommandType] = useState<ActiveCommand>("none");

  // Ref mirror for synchronous duplicate prevention
  const activeCommandMsgIdRef = useRef<string | null>(null);
  const activeCommandTypeRef = useRef<ActiveCommand>("none");

  // Completed results keyed by messageId — preserves feedback for every trigger
  const [completedResults, setCompletedResults] = useState<
    Map<string, {
      type: ActiveCommand;
      payload?: any;
      cancelled?: boolean;
    }>
  >(new Map());

  // Local state for context usage to pass to Analytic component
  const [contextUsage, setLocalContextUsage] = useState<{ prompt: number; completion: number; total: number }>({ prompt: 0, completion: 0, total: 0 });

  // Sync refs
  useEffect(() => {
    activeCommandMsgIdRef.current = activeCommandMsgId;
    activeCommandTypeRef.current = activeCommandType;
  }, [activeCommandMsgId, activeCommandType]);

  // Notify parent when inline panel opens/closes
  useEffect(() => {
    onInlinePanelChange?.(activeCommandType !== "none");
  }, [activeCommandType, onInlinePanelChange]);

  // Calculate and notify context usage (total tokens) whenever messages change
  useEffect(() => {
    let promptTokens = 0;
    let completionTokens = 0;

    for (const msg of messages) {
      if (msg.uiHidden || msg.isError || msg.isCancelled) continue;

      // Prefer API-reported usage if available
      if (msg.usage && typeof msg.usage === "object") {
        const u = msg.usage as any;
        promptTokens += u.prompt_tokens ?? u.input_tokens ?? 0;
        completionTokens += u.completion_tokens ?? u.output_tokens ?? 0;
      } else if (msg.token_usage != null) {
        // Fallback to estimated token_usage stored on the message
        if (msg.role === "user") {
          promptTokens += msg.token_usage;
        } else {
          completionTokens += msg.token_usage;
        }
      }
    }

    const total = promptTokens + completionTokens;
    
    // Update local state for Analytic component
    setLocalContextUsage({ prompt: promptTokens, completion: completionTokens, total });

    // Notify parent
    onContextUsageChange?.({
      prompt: promptTokens,
      completion: completionTokens,
      total,
    });
  }, [messages, onContextUsageChange]);

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

  // Helper to start a command panel
  const startCommand = useCallback((cmd: ActiveCommand, rawInput: string) => {
    if (activeCommandTypeRef.current !== "none") return; // Prevent stacking

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cmd}`;
    
    const userMsg = {
      id: msgId,
      role: "user" as const,
      content: rawInput,
      timestamp: Date.now(),
      token_usage: 0,
    };
    const currentMessages = chatService.getMessages();
    chatService.setMessages([...currentMessages, userMsg]);
    
    setActiveCommandMsgId(msgId);
    setActiveCommandType(cmd);
  }, [chatService]);

  // Expose handlers to parent for slash command routing
  const handleSubmit = useCallback(
    (value: string): void => {
      const trimmed = value.trim();
      const lowerCmd = trimmed.toLowerCase();

      // Intercept known commands
      if (lowerCmd === "/model-account") {
        startCommand("model-account", trimmed);
        return;
      }
      if (lowerCmd === "/history") {
        startCommand("history", trimmed);
        return;
      }
      if (lowerCmd === "/setting" || lowerCmd === "/settings") {
        startCommand("settings", trimmed);
        return;
      }
      if (lowerCmd === "/account") {
        startCommand("account", trimmed);
        return;
      }
      if (lowerCmd === "/prompt-config") {
        startCommand("prompt-config", trimmed);
        return;
      }
      if (lowerCmd === "/analytic" || lowerCmd === "/stats") {
        startCommand("analytic", trimmed);
        return;
      }
      if (lowerCmd === "/exit") {
        process.exit(0);
        return;
      }
      if (lowerCmd === "/new") {
        resetSession();
        return;
      }

      // Close any active panel before sending a normal message
      if (activeCommandTypeRef.current !== "none") {
        setActiveCommandMsgId(null);
        setActiveCommandType("none");
      }

      sendMessage({ content: trimmed });
    },
    [sendMessage, chatService, startCommand, resetSession],
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
      // Close the history panel after loading
      if (activeCommandTypeRef.current === "history") {
        setActiveCommandMsgId(null);
        setActiveCommandType("none");
      }
    },
    [resetSession, chatService],
  );

  const closeActivePanel = useCallback(() => {
    setActiveCommandMsgId(null);
    setActiveCommandType("none");
  }, []);

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

      // Record completion in history
      if (activeCommandMsgIdRef.current) {
        setCompletedResults((prev) => {
          const next = new Map(prev);
          next.set(activeCommandMsgIdRef.current!, {
            type: "model-account",
            payload: selection,
          });
          return next;
        });
      }
      closeActivePanel();
    },
    [chatService, onModelAccountStatusChange, closeActivePanel],
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

      {/* DEBUG: Print total messages and last few IDs to identify duplicates */}
      <Text dimColor>
        [DBG] Total Msgs: {messages.length} | Last User ID: {messages.filter(m => m.role === 'user').slice(-1)[0]?.id || 'N/A'}
      </Text>

      {/* Message list */}
      {messages.length > 0 && (
        <Box flexDirection="column">
          {messages.map((msg, i) => {
            if (msg.uiHidden) return null;

            // Check if this user message triggered a command panel
            const result = completedResults.get(msg.id);
            const completedForThisMsg = !!result;

            // Determine whether THIS assistant message is the one currently streaming.
            // Only show the spinner under the latest assistant turn while waiting for
            // its response (or during tool-execution auto-loop between turns).
            const isVisibleMessages = messages.filter((m) => !m.uiHidden);
            const lastVisibleIdx = isVisibleMessages.findIndex((m) => m.id === msg.id);
            const isLatestAssistant =
              msg.role === "assistant" &&
              lastVisibleIdx === isVisibleMessages.length - 1;

            // Check if this message triggers a command panel
            const isActiveTrigger = msg.id === activeCommandMsgId;
            const isCompletedResult = completedResults.has(msg.id);
            const cmdResult = completedResults.get(msg.id);

            // Extract content for display
            let visibleContent = "";
            try {
              visibleContent = extractUserVisibleContent(msg.content);
            } catch (e) {
              visibleContent = msg.content;
            }

            // Robust Duplicate Handling for Slash Commands
            // Goal: Ensure exactly ONE visual representation per command execution.
            
            const isSlashCmd = msg.role === "user" && visibleContent.trim().startsWith("/");
            const cmdName = isSlashCmd ? visibleContent.trim().split(/\s+/)[0].toLowerCase() : "";
            
            // Identify if THIS specific message object is the authoritative record for the command
            // It is authoritative if:
            // 1. It is currently triggering an open panel (isActiveTrigger)
            // 2. OR it has a recorded result in completedResults (meaning it was the trigger that finished)
            const isAuthoritativeRecord = isActiveTrigger || !!cmdResult;

            // If it's a slash command but NOT the authoritative record, hide it completely.
            // This removes the "ghost" message created by TextInput/sendMessage flow.
            if (isSlashCmd && !isAuthoritativeRecord) {
              return null;
            }

            return (
              <Box key={msg.id || i} flexDirection="column" marginBottom={isActiveTrigger && !isCompletedResult ? 0 : 1}>
                {msg.role === "user" ? (
                  <Box flexDirection="column">
                    {/* Standard User Bubble */}
                    <Box flexDirection="row">
                      <Text backgroundColor="#2a2a2a">
                        <Text color="white">{"❯ "}</Text>
                        <Text>{visibleContent}</Text>
                      </Text>
                    </Box>
                    
                    {/* If active trigger, show status line immediately below header INSIDE THE LIST */}
                    {isActiveTrigger && !isCompletedResult && (
                      <Box paddingLeft={2}>
                        <Text dimColor>{"⎿ "}{getStatusMessage(activeCommandType)}</Text>
                      </Box>
                    )}

                    {/* Completed Result Feedback (only if not currently active) */}
                    {!isActiveTrigger && isCompletedResult && cmdResult && (
                      <Box paddingLeft={2}>
                        <Text dimColor>{"⎿  "}</Text>
                        {cmdResult.cancelled ? (
                          <Text color="yellow">Cancelled — no action taken.</Text>
                        ) : (
                          <Text>{getResultFeedback(cmdResult.type, cmdResult.payload)}</Text>
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
                                    <Box key={`md-${blockIdx}`} flexDirection="row" marginBottom={1}>
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
                                    <Box key={`code-${blockIdx}`} flexDirection="column" marginBottom={1}>
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
                            
                            {/* Render tools/actions — marginTop separates them from the last markdown/code block above */}
                            {msg.parsed?.actions && msg.parsed.actions.length > 0 && (
                              <Box flexDirection="column" marginTop={1}>
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
                              <Box flexDirection="column" marginTop={1}>
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

                    {/* Generation indicator — anchored directly below the latest assistant turn */}
                    {isLatestAssistant && <GeneratingIndicator active={isStreaming} />}
                  </Box>
                )}
              </Box>
            );
          })}

          {/* Edge case: first request where NO assistant message exists yet —
              anchor the spinner right after the trailing user message so it
              doesn't float detached at the bottom of the viewport. */}
          {!messages.some((m) => !m.uiHidden && m.role === "assistant") && (
            <GeneratingIndicator active={isStreaming} />
          )}
        </Box>
      )}

      {/* 
        DEBUG MODE: REMOVED HEADER RENDERING ENTIRELY FROM CHAT.TSX
        If you still see '❯ /model-account', it is coming from App.tsx or TextInput.
        We only render Status + Panel now.
      */}
      {activeCommandType !== "none" && activeCommandMsgId && !completedResults.has(activeCommandMsgId) && (
        <Box flexDirection="column">
          {/* Panel Content ONLY - Header & Status rendered inside the message list for continuity */}
          <CommandPanel isOpen={true}>
             {activeCommandType === "model-account" && (
              <ModelAccount
                isOpen={true}
                onClose={handleCancelPanel}
                onSelect={handleModelSelect}
              />
            )}
            {activeCommandType === "history" && (
              <History
                isOpen={true}
                onClose={handleCancelPanel}
                onLoadConversation={handleLoadConversation}
              />
            )}
            {activeCommandType === "settings" && (
              <Settings
                isOpen={true}
                onClose={handleCancelPanel}
              />
            )}
            {activeCommandType === "account" && (
              <Account
                isOpen={true}
                onClose={handleCancelPanel}
              />
            )}
            {activeCommandType === "prompt-config" && (
              <PromptConfig
                onClose={handleCancelPanel}
                promptLength={promptLength}
                codeStyle={codeStyle}
                diagnosticsEnabled={diagnosticsEnabled}
                skillsEnabled={skillsEnabled}
                onSetPromptLength={onSetPromptLength}
                onSetCodeStyle={onSetCodeStyle}
                onToggleDiagnostic={onToggleDiagnostic}
                onToggleSkill={onToggleSkill}
              />
            )}
            {activeCommandType === "analytic" && (
              <Analytic
                totalTokens={contextUsage.total}
                requestCount={Math.floor(contextUsage.prompt / 100) + Math.floor(contextUsage.completion / 100)}
                onClose={handleCancelPanel}
              />
            )}
          </CommandPanel>
        </Box>
      )}

    </Box>
  );

  function getStatusMessage(type: ActiveCommand): string {
    switch (type) {
      case "model-account": return "Selecting provider/model/account...";
      case "history": return "Loading conversation history...";
      case "settings": return "Opening settings...";
      case "account": return "Managing accounts...";
      case "prompt-config": return "Configuring prompts...";
      case "analytic": return "Calculating analytics...";
      default: return "";
    }
  }

  function handleCancelPanel() {
    if (activeCommandMsgIdRef.current) {
      setCompletedResults((prev) => {
        const next = new Map(prev);
        next.set(activeCommandMsgIdRef.current!, {
          type: activeCommandTypeRef.current,
          cancelled: true,
        });
        return next;
      });
    }
    closeActivePanel();
  }

  function getResultFeedback(type: ActiveCommand, payload?: any): string {
    switch (type) {
      case "model-account":
        return `Selected ${payload?.providerId}/${payload?.modelId}${payload?.email ? ` (${payload.email})` : ""}`;
      case "history":
        return "Loaded conversation history";
      case "settings":
        return "Settings updated";
      case "account":
        return "Account management completed";
      case "prompt-config":
        return "Prompt configuration saved";
      case "analytic":
        return "Analytics displayed";
      default:
        return "Command executed";
    }
  }
}