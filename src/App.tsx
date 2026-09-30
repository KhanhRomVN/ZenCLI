import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Box, Text, useStdout } from "ink";
import { Chat } from "./components/Chat/Chat";
import { TextInput } from "./components/TextInput/index";
import { ShortcutsHelp } from "./components/TextInput/ShortcutsHelp";
import { CommandList } from "./components/TextInput/CommandList";
import { useBackendHealth } from "./hooks/useBackendHealth";
import type { RuntimeFlags } from "./services/ChatService";
import type { SystemPromptMode, PromptLengthMode } from "./prompts";
import { loadCliSettings, saveCliSettings } from "./services/CliSettingsService";

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
 * handled inline within Chat via CommandPanel wrapper.
 */
type PromptLength = 'none' | 'short' | 'medium' | 'long';
type CodeStyle = 'standard' | 'functional' | 'oop';

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
function HorizontalRule({ thinkingEnabled }: { thinkingEnabled?: boolean }): React.JSX.Element {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const color = thinkingEnabled ? "magenta" : undefined;
  const dim = !thinkingEnabled;
  return <Text color={color} dimColor={dim}>{"─".repeat(width)}</Text>;
}

export function App(): React.JSX.Element {
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const [commandsVisible, setCommandsVisible] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [appExitCountdown, setAppExitCountdown] = useState<number | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo>({
    hasModelAndAccount: false,
    providerName: '-',
    modelName: '-',
    email: '-',
  });
  const [contextUsage, setContextUsage] = useState<{ prompt: number; completion: number; total: number }>({ prompt: 0, completion: 0, total: 0 });
  const [inlinePanelOpen, setInlinePanelOpen] = useState(false);
  
  // Runtime Config States
  const initialSettings = useMemo(() => loadCliSettings(), []);
  const [promptLength, setPromptLength] = useState<PromptLength>(initialSettings.promptLength);
  const [codeStyle, setCodeStyle] = useState<CodeStyle>(initialSettings.codeStyle);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState<boolean>(initialSettings.diagnosticsEnabled);
  const [skillsEnabled, setSkillsEnabled] = useState<boolean>(initialSettings.skillsEnabled);

  useEffect(() => {
    saveCliSettings({ promptLength, codeStyle, diagnosticsEnabled, skillsEnabled });
  }, [promptLength, codeStyle, diagnosticsEnabled, skillsEnabled]);

  const { isConnected } = useBackendHealth();

  const toggleThinking = useCallback(() => {
    setThinkingEnabled(prev => !prev);
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

  const handleSubmit = useCallback(
    (value: string): void => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return;

      console.log("[DEBUG APP] Submitting:", trimmed);
      
      // Forward ALL inputs (including slash commands) to Chat
      // Chat will intercept known commands and render them inline via CommandPanel
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
      diagnosticEnabled: diagnosticsEnabled,
      skillsEnabled: skillsEnabled,
    };
  }, [promptLength, codeStyle, diagnosticsEnabled, skillsEnabled]);

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Chat Area (Scrollable/Growable) */}
      <Box flexGrow={1} flexDirection="column" minHeight={0}>
        <Chat
          isActive={true}
          onHandlersReady={setChatHandlers}
          onModelAccountStatusChange={setModelInfo}
          onInlinePanelChange={setInlinePanelOpen}
          onContextUsageChange={setContextUsage}
          getRuntimeFlags={getRuntimeFlags}
          promptLength={promptLength}
          codeStyle={codeStyle}
          diagnosticsEnabled={diagnosticsEnabled}
          skillsEnabled={skillsEnabled}
          onSetPromptLength={setPromptLength}
          onSetCodeStyle={setCodeStyle}
          onToggleDiagnostic={() => setDiagnosticsEnabled(prev => !prev)}
          onToggleSkill={() => setSkillsEnabled(prev => !prev)}
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
              {promptLength !== 'none' && (
                <>
                  <Text color={diagnosticsEnabled ? "green" : "red"} bold>DIAG:{diagnosticsEnabled ? "ON" : "OFF"}</Text>
                  <Text color={skillsEnabled ? "cyan" : "gray"} bold>SKILL:{skillsEnabled ? "ON" : "OFF"}</Text>
                  <Text dimColor>style:</Text>
                  <Text color="magenta" bold>[{codeStyle.toUpperCase()}]</Text>
                </>
              )}
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
                  ? `press ctrl+c again in ${appExitCountdown}s to exit`
                  : "? for shortcuts · / for commands"}
              </Text>
              <Box>
                <Text bold color={thinkingEnabled ? "magenta" : "gray"}>
                  THINKING: {thinkingEnabled ? "ON" : "OFF"}
                </Text>
                <Text dimColor> | </Text>
                <Text dimColor>
                  {contextUsage.total >= 1000
                    ? (contextUsage.total / 1000).toFixed(1) + "K"
                    : contextUsage.total.toString()}
                  {" "}tokens
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