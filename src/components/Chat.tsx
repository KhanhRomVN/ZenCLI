import React, { useEffect, useCallback, useRef, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { useChat } from "../hooks/useChat";
import type { RuntimeFlags } from "../services/ChatService";
import { ModelAccount } from "./ModelAccount";
import { History } from "./History";
import { Settings } from "./Settings";
import { Account } from "./Account.js";
import { AddAccount } from "./AddAccount.js";
import { PromptConfig } from "./PromptConfig";
import { Analytic } from "./Analytic";
import { Skill } from "./Skill";
import { AddSkill } from "./AddSkill";
import { ImportAccount } from "./ImportAccount";
import { saveSelection, loadSelection } from "../services/selectionStorage";
import { getApiUrl, logToFile } from "../services/api";

// ============================================================================
// TOOL RENDERER TYPES & LOGIC (Merged from ToolRenderer.tsx)
// ============================================================================

export interface ToolAction {
  type: string;
  params: Record<string, any>;
}

export interface ToolOutput {
  output: string;
  isError: boolean;
}

export interface ToolRendererProps {
  action: ToolAction;
  actionIndex: number;
  messageId: string;
  isActionClicked: boolean;
  toolOutputs?: Record<string, ToolOutput>;
}

const TOOL_LABELS: Record<string, string> = {
  read_file: "Read",
  write_to_file: "Write",
  replace_in_file: "Replace",
  delete_file: "Delete",
  list_files: "List",
  find_files: "Find",
  grep: "Grep",
  run_command: "Run",
  revert_file: "Revert",
  view_replace_history: "History",
  git_status: "GitStatus",
  git_diff: "GitDiff",
  commit_message: "Commit",
  search_skill: "SearchSkill",
  list_skill: "ListSkill",
  read_skill: "ReadSkill",
  install_skill: "InstallSkill",
};

function getToolLabel(type: string): string {
  return TOOL_LABELS[type] || type;
}

function buildReadSummary(_params: Record<string, any>, output?: ToolOutput): string {
  if (output && !output.isError && typeof output.output === "string" && output.output.length > 0) {
    const lineCount = output.output.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
    return `Read ${lineCount} lines`;
  }
  return "Reading file...";
}

function buildWriteSummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  const content = params.content || "";
  const lineCount = content ? content.split("\n").length : 0;
  return `Wrote ${lineCount} lines to ${filePath}`;
}

function buildReplaceSummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  return `Replace in ${filePath}`;
}

function buildDeleteSummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  return `Delete ${filePath}`;
}

function buildListFilesSummary(params: Record<string, any>, output?: ToolOutput): string {
  const folderPath = params.folder_path || params.path || ".";
  if (output && !output.isError && output.output) {
    const entryCount = output.output.split("\n").filter((l: string) => l.trim()).length;
    return `Listed ${entryCount} entries in ${folderPath}`;
  }
  return `List ${folderPath}`;
}

function buildFindFilesSummary(params: Record<string, any>, output?: ToolOutput): string {
  const fileName = params.file_name || params.pattern || "";
  const folderPath = params.folder_path || "";
  const scope = folderPath ? ` in ${folderPath}` : "";
  if (output && !output.isError && output.output) {
    const matchCount = output.output.split("\n").filter((l: string) => l.trim()).length;
    return `Found ${matchCount} files matching "${fileName}"${scope}`;
  }
  return `Find "${fileName}"${scope}`;
}

function buildGrepSummary(params: Record<string, any>, output?: ToolOutput): string {
  const searchTerm = params.search_term || params.searchTerm || "";
  const folderPath = params.folder_path || params.folderPath || "";
  const filePath = params.file_path || params.filePath || "";
  const scope = folderPath || filePath || "";
  if (output && !output.isError && output.output) {
    const matchLines = output.output.split("\n").filter((l: string) => l.trim());
    return `Found ${matchLines.length} matches for "${searchTerm}" in ${scope}`;
  }
  return `Grep "${searchTerm}" in ${scope}`;
}

function buildRunCommandSummary(params: Record<string, any>, output?: ToolOutput): string {
  const command = params.command || "";
  const truncated = command.length > 60 ? command.slice(0, 57) + "..." : command;
  if (output) {
    const status = output.isError ? "failed" : "done";
    return `Run "${truncated}" (${status})`;
  }
  return `Run "${truncated}"`;
}

function buildRevertSummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  const version = params.version ? ` to v${params.version}` : "";
  return `Revert ${filePath}${version}`;
}

function buildViewReplaceHistorySummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  return `View replace history of ${filePath}`;
}

function buildGitStatusSummary(_params: Record<string, any>, output?: ToolOutput): string {
  if (output && !output.isError && output.output) {
    const changedFiles = output.output.split("\n").filter((l: string) => l.trim()).length;
    return `Git status: ${changedFiles} changed files`;
  }
  return "Git status";
}

function buildGitDiffSummary(_params: Record<string, any>): string {
  return "Git diff";
}

function buildCommitMessageSummary(_params: Record<string, any>): string {
  return "Generate commit message";
}

function buildSkillSummary(type: string, params: Record<string, any>): string {
  const slug = params.slug || params.search_term || params.searchTerm || "";
  const label = getToolLabel(type);
  return slug ? `${label} "${slug}"` : label;
}

function buildSummary(action: ToolAction, output?: ToolOutput): string {
  const { type, params } = action;

  switch (type) {
    case "read_file":
      return buildReadSummary(params, output);
    case "write_to_file":
      return buildWriteSummary(params);
    case "replace_in_file":
      return buildReplaceSummary(params);
    case "delete_file":
      return buildDeleteSummary(params);
    case "list_files":
      return buildListFilesSummary(params, output);
    case "find_files":
      return buildFindFilesSummary(params, output);
    case "grep":
      return buildGrepSummary(params, output);
    case "run_command":
      return buildRunCommandSummary(params, output);
    case "revert_file":
      return buildRevertSummary(params);
    case "view_replace_history":
      return buildViewReplaceHistorySummary(params);
    case "git_status":
      return buildGitStatusSummary(params, output);
    case "git_diff":
      return buildGitDiffSummary(params);
    case "commit_message":
      return buildCommitMessageSummary(params);
    case "search_skill":
    case "list_skill":
    case "read_skill":
    case "install_skill":
      return buildSkillSummary(type, params);
    default:
      return `${getToolLabel(type)} ${JSON.stringify(params).slice(0, 80)}`;
  }
}

/**
 * Unified TUI renderer for all tool actions.
 */
function ToolRenderer({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  toolOutputs,
}: ToolRendererProps): React.JSX.Element {
  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId];
  const isError = output?.isError ?? false;

  const label = getToolLabel(action.type);
  const primaryParam =
    action.params.file_path ||
    action.params.folder_path ||
    action.params.file_name ||
    action.params.search_term ||
    action.params.searchTerm ||
    action.params.command ||
    action.params.slug ||
    "";

  const summary = buildSummary(action, output);

  const headerColor = isError ? "red" : isActionClicked ? "green" : "yellow";
  const detailColor = isError ? "red" : undefined;

  return (
    <Box flexDirection="column" marginBottom={0}>
      <Box>
        <Text color={headerColor}>{"● "}</Text>
        <Text bold color="white">
          {label}
        </Text>
        {primaryParam ? (
          <Text dimColor>({primaryParam})</Text>
        ) : null}
      </Box>

      <Box paddingLeft={2}>
        <Text dimColor>{"⎿  "}</Text>
        <Text color={detailColor} dimColor={!isError}>
          {summary}
        </Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// COMMAND PANEL LOGIC (Merged from CommandPanel.tsx)
// ============================================================================

interface CommandPanelProps {
  isOpen: boolean;
  children: React.ReactNode;
}

/**
 * A reusable wrapper for CLI command panels that mimics the ModelAccount UX.
 */
function CommandPanel({
  isOpen,
  children,
}: CommandPanelProps): React.JSX.Element | null {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;

  if (!isOpen) return null;

  return (
    <Box flexDirection="column">
      <Box marginTop={1}>
        <Text dimColor>{"─".repeat(width)}</Text>
      </Box>

      <Box flexDirection="column" paddingLeft={2}>
        {children}
      </Box>
    </Box>
  );
}

// ============================================================================
// CHAT COMPONENT LOGIC
// ============================================================================

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
 */
function GeneratingIndicator({
  active,
}: {
  active: boolean;
}): React.JSX.Element | null {
  const [elapsed, setElapsed] = useState(0);
  const [frameIdx, setFrameIdx] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (active) {
      startRef.current = Date.now();
      setElapsed(0);
    }
  }, [active]);

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
  return raw.replace(/^##\s*User Message\s*/i, "").trim();
}

interface ChatProps {
  isActive: boolean;
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
  onModelAccountStatusChange?: (status: {
    hasModelAndAccount: boolean;
    providerName: string;
    modelName: string;
    email: string;
  }) => void;
  onInlinePanelChange?: (isOpen: boolean) => void;
  onContextUsageChange?: (usage: {
    prompt: number;
    completion: number;
    total: number;
  }) => void;
  getRuntimeFlags?: () => RuntimeFlags | undefined;

  promptLength: "none" | "short" | "medium" | "long";
  codeStyle: "standard" | "functional" | "oop";
  skillsEnabled: boolean;
  onSetPromptLength: (val: "none" | "short" | "medium" | "long") => void;
  onSetCodeStyle: (val: "standard" | "functional" | "oop") => void;
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
  skillsEnabled,
  onSetPromptLength,
  onSetCodeStyle,
  onToggleSkill,
}: ChatProps): React.JSX.Element {
  const workspacePath = process.cwd();

  const { messages, sendMessage, resetSession, chatService, isStreaming } =
    useChat({
      apiUrl: getApiUrl(),
      workspacePath,
      getRuntimeFlags,
    });

  type ActiveCommand =
    | "none"
    | "model-account"
    | "history"
    | "settings"
    | "account"
    | "prompt-config"
    | "analytic"
    | "add-account"
    | "skill"
    | "add-skill"
    | "import-account";

  const [activeCommandMsgId, setActiveCommandMsgId] = useState<string | null>(
    null,
  );
  const [activeCommandType, setActiveCommandType] =
    useState<ActiveCommand>("none");

  const activeCommandMsgIdRef = useRef<string | null>(null);
  const activeCommandTypeRef = useRef<ActiveCommand>("none");

  const [completedResults, setCompletedResults] = useState<
    Map<
      string,
      {
        type: ActiveCommand;
        payload?: any;
        cancelled?: boolean;
        reason?: "user_cancel" | "closed" | "done";
      }
    >
  >(new Map());

  const [contextUsage, setLocalContextUsage] = useState<{
    prompt: number;
    completion: number;
    total: number;
  }>({ prompt: 0, completion: 0, total: 0 });

  useEffect(() => {
    activeCommandMsgIdRef.current = activeCommandMsgId;
    activeCommandTypeRef.current = activeCommandType;
  }, [activeCommandMsgId, activeCommandType]);

  useEffect(() => {
    onInlinePanelChange?.(activeCommandType !== "none");
  }, [activeCommandType, onInlinePanelChange]);

  useEffect(() => {
    let promptTokens = 0;
    let completionTokens = 0;

    for (const msg of messages) {
      if (msg.uiHidden || msg.isError || msg.isCancelled) continue;

      if (msg.usage && typeof msg.usage === "object") {
        const u = msg.usage as any;
        promptTokens += u.prompt_tokens ?? u.input_tokens ?? 0;
        completionTokens += u.completion_tokens ?? u.output_tokens ?? 0;
      } else if (msg.token_usage != null) {
        if (msg.role === "user") {
          promptTokens += msg.token_usage;
        } else {
          completionTokens += msg.token_usage;
        }
      }
    }

    const total = promptTokens + completionTokens;

    setLocalContextUsage({
      prompt: promptTokens,
      completion: completionTokens,
      total,
    });

    onContextUsageChange?.({
      prompt: promptTokens,
      completion: completionTokens,
      total,
    });
  }, [messages, onContextUsageChange]);

  useEffect(() => {
    const saved = loadSelection();
    if (saved) {
      chatService.setLastUsedModel({
        id: saved.modelId,
        providerId: saved.providerId,
      });
      chatService.setLastUsedAccount({
        id: saved.accountId || "",
        email: saved.email,
      });
      onModelAccountStatusChange?.({
        hasModelAndAccount: !!(saved.modelId && saved.accountId),
        providerName: saved.providerId,
        modelName: saved.modelId,
        email: saved.email || "-",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const startCommand = useCallback(
    (cmd: ActiveCommand, rawInput: string) => {
      if (activeCommandTypeRef.current !== "none") return;

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
    },
    [chatService],
  );

  const handleSubmit = useCallback(
    (value: string): void => {
      const trimmed = value.trim();
      const lowerCmd = trimmed.toLowerCase();

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
      if (lowerCmd === "/add-account") {
        startCommand("add-account", trimmed);
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
      if (lowerCmd === "/skill") {
        startCommand("skill", trimmed);
        return;
      }
      if (lowerCmd === "/add-skill") {
        startCommand("add-skill", trimmed);
        return;
      }
      if (lowerCmd === "/import-account") {
        startCommand("import-account", trimmed);
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

      if (activeCommandTypeRef.current !== "none") {
        setActiveCommandMsgId(null);
        setActiveCommandType("none");
      }

      sendMessage({ content: trimmed });
    },
    [sendMessage, chatService, startCommand, resetSession],
  );

  const handleLoadConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      // Đóng panel history trước khi load
      if (activeCommandTypeRef.current === "history") {
        setActiveCommandMsgId(null);
        setActiveCommandType("none");
      }

      // Reset session cũ rồi nạp lại toàn bộ messages từ file JSON
      resetSession();
      const ok = await chatService.loadConversation(conversationId);
      if (!ok) {
        chatService.setMessages([
          {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: `⚠️ Không thể tải conversation ${conversationId} (file không tồn tại hoặc lỗi parse).`,
            timestamp: Date.now(),
            isError: true,
          },
        ]);
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
      saveSelection({
        providerId: selection.providerId,
        modelId: selection.modelId,
        accountId: selection.accountId,
        email: selection.email,
      });

      onModelAccountStatusChange?.({
        hasModelAndAccount: true,
        providerName: selection.providerId,
        modelName: selection.modelId,
        email: selection.email || "-",
      });

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
    [onModelAccountStatusChange, closeActivePanel],
  );

  const handlersRef = useRef({
    handleSubmit,
    handleLoadConversation,
    handleModelSelect,
    handleResetSession: resetSession,
  });

  useEffect(() => {
    handlersRef.current = {
      handleSubmit,
      handleLoadConversation,
      handleModelSelect,
      handleResetSession: resetSession,
    };
  }, [handleSubmit, handleLoadConversation, handleModelSelect, resetSession]);

  useEffect(() => {
    onHandlersReady?.(handlersRef.current);
  }, [onHandlersReady]);

  const hasAnyMessages = messages.filter((m) => !m.uiHidden).length > 0;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Message list */}
      {messages.length > 0 && (
        <Box flexDirection="column">
          {messages.map((msg, i) => {
            if (msg.uiHidden) return null;

            const result = completedResults.get(msg.id);
            const completedForThisMsg = !!result;

            const isVisibleMessages = messages.filter((m) => !m.uiHidden);
            const lastVisibleIdx = isVisibleMessages.findIndex(
              (m) => m.id === msg.id,
            );
            const isLatestAssistant =
              msg.role === "assistant" &&
              lastVisibleIdx === isVisibleMessages.length - 1;

            const isActiveTrigger = msg.id === activeCommandMsgId;
            const isCompletedResult = completedResults.has(msg.id);
            const cmdResult = completedResults.get(msg.id);

            let visibleContent = "";
            try {
              visibleContent = extractUserVisibleContent(msg.content);
            } catch (e) {
              visibleContent = msg.content;
            }

            const isSlashCmd =
              msg.role === "user" && visibleContent.trim().startsWith("/");
            const cmdName = isSlashCmd
              ? visibleContent.trim().split(/\s+/)[0].toLowerCase()
              : "";

            const isAuthoritativeRecord = isActiveTrigger || !!cmdResult;

            if (isSlashCmd && !isAuthoritativeRecord) {
              return null;
            }

            return (
              <Box
                key={msg.id || i}
                flexDirection="column"
                marginBottom={isActiveTrigger && !isCompletedResult ? 0 : 1}
              >
                {msg.role === "user" ? (
                  <Box flexDirection="column" paddingLeft={1}>
                    <Box flexDirection="row">
                      <Text color="white">{"❯ "}</Text>
                      <Text>{visibleContent}</Text>
                    </Box>

                    {isActiveTrigger && !isCompletedResult && (
                      <Box paddingLeft={2}>
                        <Text dimColor>
                          {"⎿ "}
                          {getStatusMessage(activeCommandType)}
                        </Text>
                      </Box>
                    )}

                    {!isActiveTrigger && isCompletedResult && cmdResult && (
                      <Box paddingLeft={2}>
                        <Text dimColor>{"⎿  "}</Text>
                        <Text
                          color={
                            cmdResult.reason === "done"
                              ? "green"
                              : cmdResult.reason === "closed" ||
                                  cmdResult.reason === "user_cancel"
                                ? "yellow"
                                : undefined
                          }
                        >
                          {getResultFeedback(
                            cmdResult.type,
                            cmdResult.reason ??
                              (cmdResult.cancelled ? "user_cancel" : "done"),
                            cmdResult.payload,
                          )}
                        </Text>
                      </Box>
                    )}
                  </Box>
                ) : msg.isError ? (
                  <Text color="red">{msg.content}</Text>
                ) : (
                  <Box flexDirection="column" paddingLeft={1}>
                    {msg.thinking && (
                      <Box flexDirection="column" marginBottom={0}>
                        <Text dimColor italic>
                          {"⎿ Thinking..."}
                        </Text>
                      </Box>
                    )}

                    <Box flexDirection="row">
                      <Text>{"● "}</Text>
                      <Box flexDirection="column" flexGrow={1}>
                        {(() => {
                          const blocks = msg.parsed?.contentBlocks;
                          const hasBlocks =
                            Array.isArray(blocks) && blocks.length > 0;

                          if (hasBlocks) {
                            return (
                              <>
                                {blocks.map((block: any, blockIdx: number) => {
                                  try {
                                    if (
                                      block.type === "markdown" &&
                                      typeof block.content === "string"
                                    ) {
                                      return (
                                        <Box
                                          key={`md-${blockIdx}`}
                                          flexDirection="column"
                                          marginBottom={1}
                                        >
                                          {block.content
                                            .split("\n")
                                            .map(
                                              (line: string, lineIdx: number) => (
                                                <Text key={lineIdx}>{line}</Text>
                                              ),
                                            )}
                                        </Box>
                                      );
                                    } else if (
                                      block.type === "code" &&
                                      typeof block.content === "string"
                                    ) {
                                      return (
                                        <Box
                                          key={`code-${blockIdx}`}
                                          flexDirection="column"
                                          marginBottom={1}
                                        >
                                          <Text
                                            dimColor
                                          >{`\`\`${block.language || ""}`}</Text>
                                          {block.content
                                            .split("\n")
                                            .map(
                                              (line: string, lineIdx: number) => (
                                                <Text key={lineIdx}>{line}</Text>
                                              ),
                                            )}
                                          <Text dimColor>{"\`\`"}</Text>
                                        </Box>
                                      );
                                    }
                                  } catch (e) {
                                    console.error("Render block error:", e);
                                  }
                                  return null;
                                })}

                                {msg.parsed?.actions &&
                                  msg.parsed.actions.length > 0 && (
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
                              </>
                            );
                          } else {
                            return (
                              <>
                                {msg.content && msg.content.trim().length > 0 && (
                                  <Text>{msg.content}</Text>
                                )}
                                {msg.parsed?.actions &&
                                  msg.parsed.actions.length > 0 && (
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
                              </>
                            );
                          }
                        })()}
                      </Box>
                    </Box>

                    {isLatestAssistant && (
                      <GeneratingIndicator active={isStreaming} />
                    )}
                  </Box>
                )}
              </Box>
            );
          })}

          {!messages.some((m) => !m.uiHidden && m.role === "assistant") && (
            <GeneratingIndicator active={isStreaming} />
          )}
        </Box>
      )}

      {activeCommandType !== "none" &&
        activeCommandMsgId &&
        !completedResults.has(activeCommandMsgId) && (
          <Box flexDirection="column">
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
                <Settings isOpen={true} onClose={handleCancelPanel} />
              )}
              {activeCommandType === "account" && (
                <Account isOpen={true} onClose={handleCancelPanel} />
              )}
              {activeCommandType === "add-account" && (
                <AddAccount
                  onClose={handleCancelPanel}
                  onSuccess={() => {
                    handleCancelPanel();
                  }}
                />
              )}
              {activeCommandType === "prompt-config" && (
                <PromptConfig
                  onClose={handleCancelPanel}
                  promptLength={promptLength}
                  codeStyle={codeStyle}
                  skillsEnabled={skillsEnabled}
                  onSetPromptLength={onSetPromptLength}
                  onSetCodeStyle={onSetCodeStyle}
                  onToggleSkill={onToggleSkill}
                />
              )}
              {activeCommandType === "analytic" && (
                <Analytic messages={messages} onClose={handleCancelPanel} />
              )}
              {activeCommandType === "skill" && (
                <Skill onClose={handleCancelPanel} />
              )}
              {activeCommandType === "add-skill" && (
                <AddSkill onClose={handleCancelPanel} />
              )}
              {activeCommandType === "import-account" && (
                <ImportAccount onClose={handleCancelPanel} />
              )}
            </CommandPanel>
          </Box>
        )}
    </Box>
  );

  function getStatusMessage(type: ActiveCommand): string {
    switch (type) {
      case "model-account":
        return "Selecting provider/model/account...";
      case "history":
        return "Loading conversation history...";
      case "settings":
        return "Opening settings...";
      case "account":
        return "Managing accounts...";
      case "add-account":
        return "Adding new account...";
      case "prompt-config":
        return "Configuring prompts...";
      case "analytic":
        return "Calculating analytics...";
      default:
        return "";
    }
  }

  function handleCancelPanel(reason: "user_cancel" | "closed" | "done" = "user_cancel") {
    if (activeCommandMsgIdRef.current) {
      setCompletedResults((prev) => {
        const next = new Map(prev);
        next.set(activeCommandMsgIdRef.current!, {
          type: activeCommandTypeRef.current,
          cancelled: reason === "user_cancel",
          reason,
        });
        return next;
      });
    }
    closeActivePanel();
  }

  function getResultFeedback(
    type: ActiveCommand,
    reason?: "user_cancel" | "closed" | "done",
    payload?: any,
  ): string {
    // Success / Done messages per command type
    if (reason === "done") {
      switch (type) {
        case "model-account":
          return `Switched to ${payload?.providerId}/${payload?.modelId}${payload?.email ? ` (${payload.email})` : ""}`;
        case "history":
          return "Conversation loaded";
        case "settings":
          return "Settings saved";
        case "account":
          return "Account updated";
        case "add-account":
          return "New account added";
        case "import-account":
          return "Accounts imported";
        case "prompt-config":
          return "Prompt config applied";
        case "analytic":
          return "Session stats shown";
        case "skill":
          return "Skill manager closed";
        case "add-skill":
          return payload?.installed
            ? `Installed skill: ${payload.installed}`
            : "Marketplace browsing ended";
        default:
          return "Done";
      }
    }

    // Closed without action (e.g. Esc pressed but nothing changed)
    if (reason === "closed") {
      switch (type) {
        case "model-account":
          return "Model selection cancelled";
        case "history":
          return "History browser closed";
        case "settings":
          return "Settings unchanged";
        case "account":
          return "Account panel closed";
        case "add-account":
          return "Account creation aborted";
        case "import-account":
          return "Import cancelled";
        case "prompt-config":
          return "Prompt config discarded";
        case "analytic":
          return "Stats dismissed";
        case "skill":
          return "Skill manager closed";
        case "add-skill":
          return "Marketplace closed — no skill installed";
        default:
          return "Closed without changes";
      }
    }

    // Explicit user-cancel (same as closed for most, kept separate for future differentiation)
    switch (type) {
      case "model-account":
        return "Model selection cancelled";
      case "history":
        return "History browser cancelled";
      case "settings":
        return "Settings discarded";
      case "account":
        return "Account panel cancelled";
      case "add-account":
        return "Account creation cancelled";
      case "import-account":
        return "Import cancelled";
      case "prompt-config":
        return "Prompt config cancelled";
      case "analytic":
        return "Stats dismissed";
      case "skill":
        return "Skill manager cancelled";
      case "add-skill":
        return "Marketplace cancelled — no skill installed";
      default:
        return "Cancelled — no action taken.";
    }
  }
}