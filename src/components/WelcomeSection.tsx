import React from 'react'
import { Box, Text } from 'ink'

/**
 * Welcome section always displayed at the top of the chat screen.
 * Shows app branding and quick-start hints for new users.
 */
export function WelcomeSection(): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Text bold color="cyan">Zen CLI</Text>
      <Text dimColor>AI-powered coding assistant</Text>
      <Box marginTop={1}>
        <Text dimColor>Type </Text>
        <Text color="cyan">?</Text>
        <Text dimColor> for shortcuts · </Text>
        <Text dimColor>Type </Text>
        <Text color="cyan">/</Text>
        <Text dimColor> for commands</Text>
      </Box>
    </Box>
  )
}