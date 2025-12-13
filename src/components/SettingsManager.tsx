import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import { storage } from "../lib/storage.js";
import { getApiClient } from "../lib/api-client.js";

interface SettingsManagerProps {
  onBack: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onBack }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [message, setMessage] = useState("");

  const currentModel = storage.getDefaultModel();
  const account = storage.getActiveAccount();

  const settings = [
    { label: `🤖 Change Model (Current: ${currentModel})`, action: "model" },
    { label: "🎨 Change Theme", action: "theme" },
    { label: "🔙 Back to Main Menu", action: "back" },
  ];

  const handleAction = async (action: string) => {
    if (action === "back") {
      onBack();
      return;
    }

    if (action === "model") {
      // In a real implementation, you would show a model selection screen
      setMessage("Model selection screen would appear here");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  useInput(
    (
      input: string,
      key: { escape: any; upArrow: any; downArrow: any; return: any }
    ) => {
      if (key.escape || input === "q" || input === "b") {
        onBack();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : settings.length - 1));
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < settings.length - 1 ? prev + 1 : 0));
      }

      if (key.return) {
        handleAction(settings[selectedIndex].action);
      }
    }
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={2}>
        <Text bold color="blue">
          ⚙️ SETTINGS
        </Text>
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={2}>
        <Text color="cyan" bold>
          Active Account:
        </Text>
        <Text>{account?.name || "No account"}</Text>
        {account?.email && <Text color="gray">{account.email}</Text>}
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text color="yellow" bold>
          SETTINGS OPTIONS
        </Text>
        {settings.map((setting, index) => (
          <Box key={setting.action} marginBottom={1}>
            <Text color={selectedIndex === index ? "green" : "white"}>
              {selectedIndex === index ? "→ " : "  "}
              {setting.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box>
        <Text color="gray">↑↓ Navigate • Enter Select • Q/ESC Back</Text>
      </Box>
    </Box>
  );
};
