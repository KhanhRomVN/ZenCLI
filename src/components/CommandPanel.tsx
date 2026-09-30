import React from "react";
import { Box, Text, useStdout } from "ink";

interface CommandPanelProps {
  /** Whether the panel is currently active/open */
  isOpen: boolean;
  /** The main content of the panel (the specific list/form/etc.) */
  children: React.ReactNode;
}

/**
 * A reusable wrapper for CLI command panels that mimics the ModelAccount UX.
 * Now acts purely as a container providing the separator and padding.
 * The header (❯ /command) and status (⎿ message) are handled by Chat.tsx.
 */
export function CommandPanel({
  isOpen,
  children,
}: CommandPanelProps): React.JSX.Element | null {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;

  if (!isOpen) return null;

  return (
    <Box flexDirection="column">
      {/* Separator - Full terminal width */}
      <Box marginTop={1}>
        <Text dimColor>{"─".repeat(width)}</Text>
      </Box>

      {/* Content Area */}
      <Box flexDirection="column" paddingLeft={2}>
        {children}
      </Box>
    </Box>
  );
}