import React from "react";
import { Text, Box, useInput } from "ink";

interface ServerRoutesProps {
  onExit: () => void;
}

export const ServerRoutes: React.FC<ServerRoutesProps> = ({ onExit }) => {
  useInput((input, key) => {
    if (input === "q" || key.escape) {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">
        📡 Server Routes
      </Text>
      <Text color="gray">{"─".repeat(50)}</Text>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>GET /v1/health</Text>
        <Text color="gray"> Check server status</Text>

        <Box marginTop={1}>
          <Text bold>POST /v1/chat/completions</Text>
        </Box>
        <Text color="gray"> Send a chat message to Claude</Text>

        <Box marginTop={1}>
          <Text bold>GET /v1/models</Text>
        </Box>
        <Text color="gray"> List available models</Text>
      </Box>

      <Box marginTop={2}>
        <Text color="gray">Press Esc or Q to return</Text>
      </Box>
    </Box>
  );
};
