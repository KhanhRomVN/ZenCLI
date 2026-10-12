import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { Box, Text, useStdout } from "ink";
import { Chat } from "./components/Chat.js";
import { WelcomeSection } from "./components/WelcomeSection.js";
import { TextInput } from "./components/TextInput/TextInput.js";
import { ShortcutsHelp } from "./components/TextInput/ShortcutsHelp.js";
import { CommandList } from "./components/TextInput/CommandList.js";
import { useBackendHealth } from "./hooks/useBackendHealth.js";
import type { RuntimeFlags } from "./services/ChatService.js";
import type { SystemPromptMode, PromptLengthMode } from "./prompts/index.js";
import { loadSettings, saveSettings } from "./services/SettingService.js";
interface ResumedBannerInfo {
  id: string;
  title: string;
  messageCount: number;
}

/**
 * Root application component — manages top-level layout.
 *
 * Layout:
 * ┌─────────────────────────────┐
 * │  Chat + inline panels       │ ← Welcome / Messages / All Commands inline
 * ├─────────────────────────────┤
 * │  ❯ TextInput (fixed bottom)│ ← Hidden when ANY inline panel is active
 * └─────────────────────────────┘
 *
 * All slash commands (/model-account, /history, /settings, etc.) are now
 */
type PromptLength = "none" | "short" | "medium" | "long";
type CodeStyle = "standard" | "functional" | "oop";

/** Map UI codeStyle (ZenCLI-specific) onto the shared SystemPromptMode axis. */
const CODE_STYLE_TO_SYSTEM_PROMPT_MODE: Record<CodeStyle, SystemPromptMode> = {
  standard: "balanced",
  functional: "fast",
  oop: "thorough",
};

interface ModelInfo {
  hasModelAndAccount: boolean;
  providerName: string;
  modelName: string;
  email: string;
}

/**
 * Horizontal rule that spans the full terminal width.
 */
function HorizontalRule({
  thinkingEnabled,
}: {
  thinkingEnabled?: boolean;
}): React.JSX.Element {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const color = thinkingEnabled ? "magenta" : undefined;
  const dim = !thinkingEnabled;
  return (
    <Text color={color} dimColor={dim}>
      {"─".repeat(width)}
    </Text>
  );
}

export function App(): React.JSX.Element {
  const workspacePath = process.cwd();
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const [commandsVisible, setCommandsVisible] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [appExitCountdown, setAppExitCountdown] = useState<number | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo>({
    hasModelAndAccount: false,
    providerName: "-",
    modelName: "-",
    email: "-",
  });
  const [contextUsage, setContextUsage] = useState<{
    prompt: number;
    completion: number;
    total: number;
  }>({ prompt: 0, completion: 0, total: 0 });
  const [inlinePanelOpen, setInlinePanelOpen] = useState(false);
  const [resumedBanner, setResumedBanner] = useState<ResumedBannerInfo | null>(
    null,
  );
  const autoResumeDoneRef = useRef(false);

  // Callback ref to access Chat's handlers from App level
  const [chatHandlers, setChatHandlers] = useState<{
    handleSubmit: (value: string) => void;
    /** Load conversation by ID. Returns true if successful, false otherwise. */
    handleLoadConversation: (conversationId: string) => Promise<boolean>;
    handleModelSelect: (selection: {
      providerId: string;
      modelId: string;
      accountId?: string;
    }) => void;
    handleResetSession: () => void;
  } | null>(null);

  // ── Auto-resume: load conversation cuối cùng đã chat thật sự khi boot ──
  // Chạy 1 lần duy nhất sau khi Chat component report handlers ready.
  // Ưu tiên:
  //   1. Forced ID từ --resume <id> (env ZEN_FORCED_CONVERSATION_ID)
  //   2. Auto-detect latest active conversation (≥1 user msg)
  // Bỏ qua nếu có flag --no-resume / env ZEN_NO_RESUME=1
  useEffect(() => {
    if (!chatHandlers || autoResumeDoneRef.current) return;
    autoResumeDoneRef.current = true;

    // Escape hatch qua CLI arg hoặc env var
    const noResumeFlag =
      process.argv.includes("--no-resume") ||
      process.argv.includes("-nr") ||
      process.env.ZEN_NO_RESUME === "1";
    if (noResumeFlag) return;

    let cancelled = false;
    (async () => {
      try {
        // Chỉ resume khi được yêu cầu RÕ RÀNG qua --resume <id> (env ZEN_FORCED_CONVERSATION_ID).
        // Không auto-detect latest conversation nữa — `zen-cli` không tham số = session mới trắng.
        const forcedId = process.env.ZEN_FORCED_CONVERSATION_ID;
        if (forcedId) {
          const ok = await chatHandlers.handleLoadConversation(forcedId);
          if (ok && !cancelled) {
            setResumedBanner({
              id: forcedId,
              title: "(Restored from binding)",
              messageCount: 0,
            });
          }
        }
      } catch {
        // Silent fail — user vẫn có thể dùng /history thủ công
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatHandlers, workspacePath]);

  // Tự ẩn banner sau 6 giây
  useEffect(() => {
    if (!resumedBanner) return;
    const timer = setTimeout(() => setResumedBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [resumedBanner]);

  // Runtime Config States
  const initialSettings = useMemo(() => loadSettings(), []);
  const [promptLength, setPromptLength] = useState<PromptLength>(
    initialSettings.promptLength,
  );
  const [codeStyle, setCodeStyle] = useState<CodeStyle>(
    initialSettings.codeStyle,
  );
  const [skillsEnabled, setSkillsEnabled] = useState<boolean>(
    initialSettings.skillsEnabled,
  );

  useEffect(() => {
    saveSettings({ promptLength, codeStyle, skillsEnabled });
  }, [promptLength, codeStyle, skillsEnabled]);

  const { isConnected } = useBackendHealth();

  const toggleThinking = useCallback(() => {
    setThinkingEnabled((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(
    (value: string): void => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return;

      // Forward ALL inputs (including slash commands) to Chat
      setCommandsVisible(false);
      setShortcutsVisible(false);
      chatHandlers?.handleSubmit(trimmed);
    },
    [chatHandlers],
  );

  // Snapshot-free getter for runtime flags
  const getRuntimeFlags = useCallback((): RuntimeFlags => {
    return {
      promptLengthMode: promptLength as PromptLengthMode,
      systemPromptMode: CODE_STYLE_TO_SYSTEM_PROMPT_MODE[codeStyle],
      skillsEnabled: skillsEnabled,
    };
  }, [promptLength, codeStyle, skillsEnabled]);

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Chat Area (Scrollable/Growable) */}
      <Box flexGrow={1} flexDirection="column" minHeight={0}>
        <WelcomeSection
          providerName={modelInfo.providerName}
          modelName={modelInfo.modelName}
          email={modelInfo.email}
          workspacePath={workspacePath}
        />

        {/* Auto-resume notification banner */}
        {resumedBanner && (
          <Box paddingX={1} marginBottom={1}>
            <Text color="green" dimColor>
              ↻ Resumed{" "}
              <Text bold color="white">
                "{resumedBanner.title}"
              </Text>{" "}
              ({resumedBanner.messageCount} messages) · /new to start fresh
            </Text>
          </Box>
        )}

        <Chat
          isActive={true}
          onHandlersReady={setChatHandlers}
          onModelAccountStatusChange={setModelInfo}
          onInlinePanelChange={setInlinePanelOpen}
          onContextUsageChange={setContextUsage}
          getRuntimeFlags={getRuntimeFlags}
          promptLength={promptLength}
          codeStyle={codeStyle}
          skillsEnabled={skillsEnabled}
          onSetPromptLength={setPromptLength}
          onSetCodeStyle={setCodeStyle}
          onToggleSkill={() => setSkillsEnabled((prev) => !prev)}
        />
      </Box>

      {/* Fixed Bottom Section: Status + Input + Footer */}
      {/* Completely unmount bottom section when ANY inline panel is open to prevent ghost renders */}
      {inlinePanelOpen ? null : (
        <Box flexDirection="column">
          {/* Spacer */}
          <Box height={1} />

          {/* Status Bar Above Input */}
          <Box justifyContent="space-between" paddingX={1}>
            <Text dimColor>
              {modelInfo.providerName}/{modelInfo.modelName} {modelInfo.email}
            </Text>
            <Box gap={1}>
              {promptLength !== "none" && (
                <>
                  <Text color={skillsEnabled ? "cyan" : "gray"} bold>
                    SKILL:{skillsEnabled ? "ON" : "OFF"}
                  </Text>
                  <Text dimColor>style:</Text>
                  <Text color="magenta" bold>
                    [{codeStyle.toUpperCase()}]
                  </Text>
                </>
              )}
              <Text dimColor>length:</Text>
              <Text
                color={
                  promptLength === "none"
                    ? "gray"
                    : promptLength === "short"
                      ? "blue"
                      : promptLength === "medium"
                        ? "green"
                        : "yellow"
                }
                bold
              >
                [{promptLength.toUpperCase()}]
              </Text>
            </Box>
          </Box>

          <HorizontalRule thinkingEnabled={thinkingEnabled} />

          {/* Input Area */}
          <Box paddingX={1}>
            <TextInput
              onSubmit={handleSubmit}
              onShortcutsToggle={setShortcutsVisible}
              onCommandToggle={setCommandsVisible}
              isConnected={isConnected}
              onToggleThinking={toggleThinking}
              onExitStateChange={setAppExitCountdown}
            />
          </Box>

          <HorizontalRule thinkingEnabled={thinkingEnabled} />

          {/* Footer Status Bar */}
          {!shortcutsVisible && !commandsVisible && (
            <Box justifyContent="space-between" paddingX={1}>
              <Text
                dimColor={appExitCountdown === null}
                color={appExitCountdown !== null ? "yellow" : undefined}
              >
                {appExitCountdown !== null
                  ? `press esc again in ${appExitCountdown}s to exit`
                  : `? for shortcuts · / for commands${thinkingEnabled ? " · TAB for thinking" : ""}`}
              </Text>
              <Box>
                <Text bold color={thinkingEnabled ? "magenta" : "gray"}>
                  THINKING: {thinkingEnabled ? "ON" : "OFF"}
                </Text>
                <Text dimColor> | </Text>
                <Text dimColor>
                  {contextUsage.total >= 1000
                    ? (contextUsage.total / 1000).toFixed(1) + "K"
                    : contextUsage.total.toString()}{" "}
                  tokens
                </Text>
              </Box>
            </Box>
          )}

          {/* Inline Dropdowns (Shortcuts/Commands) */}
          {shortcutsVisible && <ShortcutsHelp />}
          {commandsVisible && (
            <CommandList
              onClose={() => setCommandsVisible(false)}
              onSelect={(command) => {
                setCommandsVisible(false);
                handleSubmit(command);
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
