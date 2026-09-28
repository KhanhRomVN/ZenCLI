import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

interface CommandEntry {
  command: string
  description: string
}

const COMMANDS: CommandEntry[] = [
  { command: '/model-account', description: 'Select provider, model and account' },
  { command: '/new', description: 'Start a new conversation' },
  { command: '/history', description: 'View conversation list' },
  { command: '/setting', description: 'Open settings' },
  { command: '/account', description: 'Manage account' },
  { command: '/exit', description: 'Exit application' },
]

interface CommandListProps {
  onSelect?: (command: string) => void
}

/**
 * Command list panel displayed below TextInput when user types "/"
 * as the first character. Supports ↑↓ navigation and Enter to select.
 */
export function CommandList({ onSelect }: CommandListProps): React.JSX.Element {
  const [cursorIndex, setCursorIndex] = useState(0)

  useInput((input, key) => {
    if (key.upArrow) {
      setCursorIndex(prev => Math.max(0, prev - 1))
    } else if (key.downArrow) {
      setCursorIndex(prev => Math.min(COMMANDS.length - 1, prev + 1))
    } else if (key.return) {
      onSelect?.(COMMANDS[cursorIndex].command)
    }
  })

  return (
    <Box flexDirection="column" paddingX={1} marginTop={0}>
      {COMMANDS.map((entry, i) => (
        <Box key={i}>
          <Box width={20}>
            <Text color={i === cursorIndex ? 'cyan' : 'gray'}>
              {`  ${entry.command}`}
            </Text>
          </Box>
          <Text color={i === cursorIndex ? 'cyan' : 'gray'}>{entry.description}</Text>
        </Box>
      ))}
    </Box>
  )
}