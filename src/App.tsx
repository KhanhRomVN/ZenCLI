import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Box, Text } from "ink";
import { Chat } from "./components/Chat/Chat";
import { TextInput } from "./components/TextInput/index";
import { ShortcutsHelp } from "./components/TextInput/ShortcutsHelp";
import { CommandList } from "./components/TextInput/CommandList";
import { History } from "./components/History";
import { Settings } from "./components/Settings";
import { Account } from "./components/Account";
import { useBackendHealth } from "./hooks/useBackendHealth";
import type { RuntimeFlags } from "./services/ChatService";
import type { SystemPromptMode, PromptLengthMode } from "./prompts";
import { loadCliSettings, saveCliSettings } from "./services/CliSettingsService";

type ActivePanel =
  | "none"
  | "history"
  | "settings"
  | "account";

/**
 * Root application component — manages top-level layout.
 *
 * Layout:
 * ┌─────────────────────────────┐
 * │  Chat + inline panels       │ ← Welcome / Messages / ModelAccount inline
 * ├─────────────────────────────┤
 * │  ❯ TextInput (fixed bottom)│ ← Hidden when inline panel is active
 * └─────────────────────────────┘
 *
 * /model-account is handled inline within Chat (not as overlay).
 * TextInput is hidden when an inline panel is open.
 */
type PromptLength = 'none' | 'short' | 'medium' | 'long';
type CodeStyle = 'standard' | 'functional' | 'oop';
// Cycle order: none -> short -> medium -> long -> none
const PROMPT_LENGTHS: PromptLength[] = ['none', 'short', 'medium', 'long'];
const CODE_STYLES: CodeStyle[] = ['standard', 'functional', 'oop'];

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

export function App(): React.JSX.Element {
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const [commandsVisible, setCommandsVisible] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo>({
    hasModelAndAccount: false,
    providerName: '-',
    modelName: '-',
    email: '-',
  });
  const [inlinePanelOpen, setInlinePanelOpen] = useState(false);
  
  // Runtime Config States — lazily initialized from ~/.khanhromvn-zen/cli-settings.json
  // so that toggles survive `npm run dev` restarts. Falls back to defaults if the
  // file is missing or contains invalid values.
  const initialSettings = useMemo(() => loadCliSettings(), []);
  const [promptLength, setPromptLength] = useState<PromptLength>(initialSettings.promptLength);
  const [codeStyle, setCodeStyle] = useState<CodeStyle>(initialSettings.codeStyle);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState<boolean>(initialSettings.diagnosticsEnabled);
  const [skillsEnabled, setSkillsEnabled] = useState<boolean>(initialSettings.skillsEnabled);

  // Persist every change back to disk (best-effort, synchronous fs write).
  useEffect(() => {
    saveCliSettings({ promptLength, codeStyle, diagnosticsEnabled, skillsEnabled });
  }, [promptLength, codeStyle, diagnosticsEnabled, skillsEnabled]);

  const { isConnected } = useBackendHealth();

  const cyclePromptLength = useCallback(() => {
    setPromptLength((prev) => {
      const currentIndex = PROMPT_LENGTHS.indexOf(prev);
      const nextIndex = (currentIndex + 1) % PROMPT_LENGTHS.length;
      return PROMPT_LENGTHS[nextIndex];
    });
  }, []);

  const cycleCodeStyle = useCallback(() => {
    setCodeStyle((prev) => {
      const currentIndex = CODE_STYLES.indexOf(prev);
      const nextIndex = (currentIndex + 1) % CODE_STYLES.length;
      return CODE_STYLES[nextIndex];
    });
  }, []);

  const toggleDiagnostics = useCallback(() => {
    setDiagnosticsEnabled(prev => !prev);
  }, []);

  const toggleSkills = useCallback(() => {
    setSkillsEnabled(prev => !prev);
  }, []);

  // Callback ref to access Chat's handlers from App level
  const [chatHandlers, setChatHandlers] = useState<{
    handleSubmit: (value: string) => void;
    handleLoadConversation: (conversationId: string) => void;
    handleModelSelect: (selection: {
      providerId: string;
      modelId: string;
      accountId?: string;
    }) => void;
    handleResetSession: () => void;
  } | null>(null);

  const closeAllPanels = useCallback((): void => {
    setActivePanel("none");
    setShortcutsVisible(false);
    setCommandsVisible(false);
  }, []);

  const handleSubmit = useCallback(
    (value: string): void => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return;

      // Handle slash commands at App level
      if (trimmed.startsWith("/")) {
        const parts = trimmed.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const arg = parts[1]?.toLowerCase();

        switch (cmd) {
          // /model-account is handled entirely inside Chat — forward directly
          case "/model-account":
            setCommandsVisible(false);
            setShortcutsVisible(false);
            chatHandlers?.handleSubmit(trimmed);
            return;
          
          // Runtime Config Commands
          case "/prompt-length":
            setCommandsVisible(false);
            setShortcutsVisible(false);
            if (arg === 'short' || arg === 'medium' || arg === 'long') {
              setPromptLength(arg);
            } else {
              cyclePromptLength();
            }
            return;
            
          case "/style-code":
            setCommandsVisible(false);
            setShortcutsVisible(false);
            if (arg === 'standard' || arg === 'functional' || arg === 'oop') {
              setCodeStyle(arg);
            } else {
              cycleCodeStyle();
            }
            return;
            
          case "/diagnostic":
          case "/diag":
            setCommandsVisible(false);
            setShortcutsVisible(false);
            if (arg === 'on') setDiagnosticsEnabled(true);
            else if (arg === 'off') setDiagnosticsEnabled(false);
            else toggleDiagnostics();
            return;
            
          case "/skill":
          case "/skills":
            setCommandsVisible(false);
            setShortcutsVisible(false);
            if (arg === 'on') setSkillsEnabled(true);
            else if (arg === 'off') setSkillsEnabled(false);
            else toggleSkills();
            return;

          case "/new":
            chatHandlers?.handleResetSession();
            closeAllPanels();
            return;
          case "/history":
            setActivePanel("history");
            setCommandsVisible(false);
            setShortcutsVisible(false);
            return;
          case "/setting":
          case "/settings":
            setActivePanel("settings");
            setCommandsVisible(false);
            setShortcutsVisible(false);
            return;
          case "/account":
            setActivePanel("account");
            setCommandsVisible(false);
            setShortcutsVisible(false);
            return;
          case "/exit":
            process.exit(0);
            return;
          default:
            // Unknown command — forward to Chat as normal message
            break;
        }
      }

      // Non-command input: close panels and forward to Chat
      closeAllPanels();
      chatHandlers?.handleSubmit(trimmed);
    },
    [chatHandlers, closeAllPanels],
  );

  const handleLoadConversation = useCallback(
    (conversationId: string): void => {
      chatHandlers?.handleLoadConversation(conversationId);
      setActivePanel("none");
    },
    [chatHandlers],
  );

  const handleModelSelect = useCallback(
    (selection: {
      providerId: string;
      modelId: string;
      accountId?: string;
    }): void => {
      chatHandlers?.handleModelSelect(selection);
      setActivePanel("none");
    },
    [chatHandlers],
  );

  // TextInput should ONLY be hidden when a full-screen overlay panel (Settings, History, Account) is active.
  // The inline ModelAccount panel is part of the Chat flow and does NOT require hiding the input.
  const showTextInput = activePanel === "none";

  // Snapshot-free getter: ChatService calls this at prompt-build time so it
  // always reads the latest UI toggles without re-rendering the whole tree.
  const getRuntimeFlags = useCallback((): RuntimeFlags => {
    return {
      promptLengthMode: promptLength as PromptLengthMode,
      systemPromptMode: CODE_STYLE_TO_SYSTEM_PROMPT_MODE[codeStyle],
      diagnosticEnabled: diagnosticsEnabled,
      skillsEnabled: skillsEnabled,
    };
  }, [promptLength, codeStyle, diagnosticsEnabled, skillsEnabled]);

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* ─── Content Area ─── */}
      <Box flexGrow={1} flexDirection="column" minHeight={0}>
        {/* Chat is always rendered */}
        <Chat
          isActive={activePanel === "none"}
          onHandlersReady={setChatHandlers}
          onModelAccountStatusChange={setModelInfo}
          onInlinePanelChange={setInlinePanelOpen}
          getRuntimeFlags={getRuntimeFlags}
        />

        {/* Overlay panels (non-chat panels only) */}
        {activePanel === "history" && (
          <History
            isOpen={true}
            onClose={() => setActivePanel("none")}
            onLoadConversation={handleLoadConversation}
          />
        )}
        {activePanel === "settings" && (
          <Settings isOpen={true} onClose={() => setActivePanel("none")} />
        )}
        {activePanel === "account" && (
          <Account isOpen={true} onClose={() => setActivePanel("none")} />
        )}
      </Box>

      {/* ─── TextInput area (hidden when inline panel is open) ─── */}
      {showTextInput && (
        <>
          {/* Spacer line to separate chat content from status bar */}
          <Box height={1} />

          {/* ─── Status Bar (Above Divider) ─── */}
          <Box justifyContent="space-between" paddingX={1}>
            {/* Left: Model Info */}
            <Text dimColor>
              {modelInfo.providerName}/{modelInfo.modelName} {modelInfo.email}
            </Text>

            {/* Right: Runtime Flags */}
            <Box gap={1}>
              {/* DIAG / SKILL / STYLE — hidden when promptLength is 'none' */}
              {promptLength !== 'none' && (
                <>
                  <Text color={diagnosticsEnabled ? "green" : "red"} bold>
                    DIAG:{diagnosticsEnabled ? "ON" : "OFF"}
                  </Text>
                  <Text color={skillsEnabled ? "cyan" : "gray"} bold>
                    SKILL:{skillsEnabled ? "ON" : "OFF"}
                  </Text>
                  <Text dimColor>style:</Text>
                  <Text color="magenta" bold>
                    [{codeStyle.toUpperCase()}]
                  </Text>
                </>
              )}
              {/* LENGTH — always visible */}
              <Text dimColor>length:</Text>
              <Text
                color={
                  promptLength === 'none'   ? 'gray'   :
                  promptLength === 'short'  ? 'blue'   :
                  promptLength === 'medium' ? 'green'  : 'yellow'
                }
                bold
              >
                [{promptLength.toUpperCase()}]
              </Text>
            </Box>
          </Box>
          
          <Text dimColor>{"─".repeat(process.stdout.columns || 80)}</Text>
          <TextInput
            onSubmit={handleSubmit}
            onShortcutsToggle={setShortcutsVisible}
            onCommandToggle={setCommandsVisible}
            isConnected={isConnected}
            promptLength={promptLength}
            onCyclePromptLength={cyclePromptLength}
          />
          <Text dimColor>{"─".repeat(process.stdout.columns || 80)}</Text>

          {/* Panels below TextInput */}
          {shortcutsVisible && <ShortcutsHelp />}
          {commandsVisible && (
            <CommandList
              onClose={() => setCommandsVisible(false)}
              onSelect={(command) => {
                setCommandsVisible(false);
                handleSubmit(command);
              }}
              onToggleDiagnostic={toggleDiagnostics}
              onToggleSkill={toggleSkills}
              onCyclePromptLength={cyclePromptLength}
              onCycleCodeStyle={cycleCodeStyle}
              diagnosticsEnabled={diagnosticsEnabled}
              skillsEnabled={skillsEnabled}
              promptLength={promptLength}
              codeStyle={codeStyle}
            />
          )}

          {/* Status bar */}
          {!shortcutsVisible && !commandsVisible && (
            <Box paddingX={1}>
              <Text dimColor>? for shortcuts · / for commands</Text>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}