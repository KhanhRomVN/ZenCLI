import React from "react";
import { Text, Box, useInput } from "ink";

interface HelpScreenProps {
  onBack: () => void;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({ onBack }) => {
  useInput((input: string, key: { escape: any; return: any }) => {
    if (key.escape || input === "q" || input === "b" || key.return) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={2}>
        <Text bold color="blue">
          📖 ZENCLI HELP
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text color="green" bold>
          🚀 QUICK START
        </Text>
        <Text color="white">1. Add your first account:</Text>
        <Text color="cyan"> zencli --login</Text>
        <Text color="white">2. Start chatting with Claude:</Text>
        <Text color="cyan"> zencli</Text>
        <Text color="white">or:</Text>
        <Text color="cyan"> zencli --chat</Text>
        <Text color="white">3. Open main menu:</Text>
        <Text color="cyan"> zencli --menu</Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text color="yellow" bold>
          📋 MAIN COMMANDS
        </Text>
        <Text color="cyan"> zencli </Text>
        <Text color="gray"> Start chat directly (Default)</Text>
        <Text color="cyan"> zencli --menu </Text>
        <Text color="gray"> Show main menu (TUI)</Text>
        <Text color="cyan"> zencli --help </Text>
        <Text color="gray"> Show this help screen</Text>
        <Text color="cyan"> zencli --login </Text>
        <Text color="gray"> Quick login - add new account</Text>
        <Text color="cyan"> zencli --account </Text>
        <Text color="gray"> Manage accounts (TUI)</Text>
        <Text color="cyan"> zencli --logs </Text>
        <Text color="gray"> Show log directory path</Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text color="magenta" bold>
          🎨 TERMINAL UI FEATURES
        </Text>
        <Text color="gray">• Interactive menu navigation</Text>
        <Text color="gray">• Real-time chat with Claude</Text>
        <Text color="gray">• Account switching</Text>
        <Text color="gray">• Settings management</Text>
        <Text color="gray">• All through beautiful TUI</Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text color="cyan" bold>
          💬 CHAT CONTROLS
        </Text>
        <Text color="gray">• Type your message and press Enter to send</Text>
        <Text color="gray">• Type /exit to quit chat</Text>
        <Text color="gray">• Type /clear to clear screen</Text>
        <Text color="gray">• Type /new to start new conversation</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press any key to return to main menu</Text>
      </Box>
    </Box>
  );
};
