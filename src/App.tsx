import React, { useState, useCallback } from "react";
import { Box, Text } from "ink";
import { Chat } from "./components/Chat/Chat";
import { TextInput } from "./components/TextInput/index";
import { ShortcutsHelp } from "./components/TextInput/ShortcutsHelp";
import { CommandList } from "./components/TextInput/CommandList";
import { ModelAccount } from "./components/ModelAccount";
import { History } from "./components/History";
import { Settings } from "./components/Settings";
import { Account } from "./components/Account";
import { useBackendHealth } from "./hooks/useBackendHealth";

type ActivePanel =
  | "none"
  | "model-account"
  | "history"
  | "settings"
  | "account";

/**
 * Root application component — manages top-level layout.
 *
 * Layout:
 * ┌─────────────────────────────┐
 * │  Active Panel (flexGrow=1)  │ ← Chat / Account / History / Settings / ModelAccount
 * ├─────────────────────────────┤
 * │  ❯ TextInput (fixed bottom)│ ← Always visible, independent of active panel
 * └─────────────────────────────┘
 *
 * TextInput lives here (not in Chat) because it must always be visible
 * regardless of which panel is active. Slash commands switch panels.
 */
export function App(): React.JSX.Element {
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const [commandsVisible, setCommandsVisible] = useState(false);
  const [hasModelAndAccount, setHasModelAndAccount] = useState(true);
  const { isConnected } = useBackendHealth();

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

      // Handle slash commands at App level (panel switching)
      if (trimmed.startsWith("/")) {
        const command = trimmed.toLowerCase();
        switch (command) {
          case "/model-account":
            setActivePanel("model-account");
            setCommandsVisible(false);
            setShortcutsVisible(false);
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

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* ─── Active Panel Area (flexGrow=1) ─── */}
      <Box flexGrow={1} flexDirection="column">
        {/* Chat is always rendered (message state persists across panel switches) */}
        <Chat
          isActive={activePanel === "none"}
          onHandlersReady={setChatHandlers}
          onModelAccountStatusChange={setHasModelAndAccount}
        />

        {/* Overlay panels — rendered on top of Chat when active */}
        {activePanel === "model-account" && (
          <ModelAccount
            isOpen={true}
            onClose={() => setActivePanel("none")}
            onSelect={handleModelSelect}
          />
        )}
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

      {/* ─── Separator ─── */}
      <Text dimColor>{"─".repeat(process.stdout.columns || 80)}</Text>

      {/* ─── TextInput (always visible, fixed at bottom) ─── */}
      <TextInput
        onSubmit={handleSubmit}
        onShortcutsToggle={setShortcutsVisible}
        onCommandToggle={setCommandsVisible}
        isConnected={isConnected}
      />

      {/* ─── Bottom separator ─── */}
      <Text dimColor>{"─".repeat(process.stdout.columns || 80)}</Text>

      {/* ─── Panels below TextInput ─── */}
      {shortcutsVisible && <ShortcutsHelp />}
      {commandsVisible && (
        <CommandList
          onSelect={(command) => {
            setCommandsVisible(false);
            handleSubmit(command);
          }}
        />
      )}

      {/* ─── Status bar (only when no panel is active) ─── */}
      {!shortcutsVisible && !commandsVisible && activePanel === "none" && (
        <Box paddingX={1}>
          <Text dimColor>? for shortcuts · / for commands</Text>
        </Box>
      )}
    </Box>
  );
}
