import React from 'react'
import { Box, Text, useInput } from 'ink'

interface ErrorScreenProps {
  message: string | null
  onRecover: () => void
}

/**
 * Error/fallback screen displayed when an unrecoverable error occurs.
 * Press Enter to attempt recovery back to the chat screen.
 */
export function ErrorScreen({ message, onRecover }: ErrorScreenProps): React.JSX.Element {
  useInput((_input, key) => {
    if (key.return) {
      onRecover()
    }
  })

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Text bold color="red">Something went wrong</Text>
      <Box marginTop={1} paddingX={2}>
        <Text color="red">{message ?? 'Unknown error'}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press </Text>
        <Text bold>Enter</Text>
        <Text dimColor> to return to chat</Text>
      </Box>
    </Box>
  )
}