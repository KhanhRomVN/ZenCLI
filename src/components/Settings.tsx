import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getApiUrl, setApiUrl } from "../services/api";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "general" | "about";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "about", label: "About" },
];

/**
 * Settings panel for configuring backend URL and viewing app info.
 * Ink-based terminal UI following the pattern from temp/Zen settings.
 */
export function Settings({
  isOpen,
  onClose,
}: SettingsProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [apiUrlInput, setApiUrlInput] = useState(getApiUrl());
  const [editingUrl, setEditingUrl] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);

  // Reset state when opened
  React.useEffect(() => {
    if (isOpen) {
      setApiUrlInput(getApiUrl());
      setEditingUrl(false);
      setCursorIndex(0);
    }
  }, [isOpen]);

  useInput((input, key) => {
    if (!isOpen) return;

    if (key.escape) {
      if (editingUrl) {
        setEditingUrl(false);
        setApiUrlInput(getApiUrl());
      } else {
        onClose();
      }
      return;
    }

    if (editingUrl) {
      // Simple text input for URL editing
      if (key.return) {
        setApiUrl(apiUrlInput);
        setEditingUrl(false);
      } else if (key.backspace || key.delete) {
        setApiUrlInput((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setApiUrlInput((prev) => prev + input);
      }
      return;
    }

    // Tab navigation
    if (key.leftArrow || key.rightArrow) {
      setActiveTab((prev) => (prev === "general" ? "about" : "general"));
      return;
    }

    if (key.upArrow) {
      setCursorIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setCursorIndex((prev) => Math.min(2, prev + 1));
      return;
    }

    if (key.return && activeTab === "general") {
      if (cursorIndex === 0) {
        setEditingUrl(true);
      }
    }
  });

  if (!isOpen) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
    >
      {/* Tab bar */}
      <Box>
        {TABS.map((tab) => (
          <Box key={tab.id} marginRight={2}>
            <Text
              color={activeTab === tab.id ? "cyan" : undefined}
              bold={activeTab === tab.id}
            >
              {activeTab === tab.id ? `[${tab.label}]` : tab.label}
            </Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>{"←→ switch tabs · Esc close"}</Text>

      <Box flexDirection="column" marginTop={1}>
        {activeTab === "general" && (
          <Box flexDirection="column">
            <Box>
              <Text color={cursorIndex === 0 ? "cyan" : undefined}>
                {cursorIndex === 0 ? "❯ " : "  "}
              </Text>
              <Text>Backend URL: </Text>
              {editingUrl ? (
                <Text color="green">{apiUrlInput}|</Text>
              ) : (
                <Text>{getApiUrl()}</Text>
              )}
            </Box>
            {editingUrl && (
              <Box paddingLeft={4}>
                <Text dimColor>Type new URL, Enter to save, Esc to cancel</Text>
              </Box>
            )}
            <Box marginTop={1}>
              <Text dimColor>{"  Press Enter on URL to edit"}</Text>
            </Box>
          </Box>
        )}

        {activeTab === "about" && (
          <Box flexDirection="column">
            <Text bold>ZenCLI</Text>
            <Text dimColor>Terminal-based AI assistant</Text>
            <Text dimColor>Built with Ink (React for CLI)</Text>
            <Box marginTop={1}>
              <Text dimColor>Data: ~/.khanhromvn-zen/</Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
