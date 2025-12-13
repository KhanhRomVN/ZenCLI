import React, { useState, useEffect } from "react";
import { render, Text, Box, useInput, useApp } from "ink";
import { storage } from "../lib/storage.js";
import gradient from "gradient-string";

interface MainMenuProps {
  onSelect: (option: string) => void;
  onExit: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelect, onExit }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();
  const account = storage.getActiveAccount();

  const options = [
    { label: "💬 Start Chat", value: "chat" },
    { label: "🔐 Add Account", value: "add-account" },
    { label: "👥 Manage Accounts", value: "manage-accounts" },
    { label: "⚙️ Settings", value: "settings" },
    { label: "📖 Help", value: "help" },
    { label: "🚪 Exit", value: "exit" },
  ];

  useInput(
    (
      input: string,
      key: { upArrow: any; downArrow: any; return: any; escape: any }
    ) => {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }

      if (key.return) {
        const option = options[selectedIndex].value;
        if (option === "exit") {
          onExit();
        } else {
          onSelect(option);
        }
      }

      if (input === "q" || input === "Q" || key.escape) {
        onExit();
      }
    }
  );

  const headerText = gradient([
    "#ff0000",
    "#ff8c00",
    "#ffeb3b",
    "#4caf50",
    "#2196f3",
    "#9c27b0",
  ])("ZenCLI");

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={2}>
        <Text bold color="cyan">
          {headerText}
        </Text>
      </Box>

      <Text color="magenta" bold>
        ✨ Claude AI Command Line Interface
      </Text>
      <Text color="gray">{"─".repeat(50)}</Text>

      <Box marginTop={1} marginBottom={2}>
        {account ? (
          <Box flexDirection="column">
            <Text color="green" bold>
              🟢 ACTIVE ACCOUNT
            </Text>
            <Text color="cyan">👤 {account.name}</Text>
            {account.email && <Text color="cyan">📧 {account.email}</Text>}
            <Text color="cyan">🔑 ID: {account.orgId.slice(0, 8)}...</Text>
          </Box>
        ) : (
          <Text color="yellow">
            ⚠️ No active account. Use `zencli auth login` to login.
          </Text>
        )}
      </Box>

      <Text color="blue" bold>
        📖 MAIN MENU
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {options.map((option, index) => (
          <Box key={option.value} marginBottom={1}>
            <Text color={selectedIndex === index ? "green" : "white"}>
              {selectedIndex === index ? "→ " : "  "}
              {option.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={2}>
        <Text color="gray">↑↓ Navigate • Enter Select • Q/ESC Exit</Text>
      </Box>
    </Box>
  );
};
