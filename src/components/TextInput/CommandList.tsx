import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

interface CommandEntry {
  command: string
  description: string
}

// Base commands that don't change based on state
const STATIC_COMMANDS: CommandEntry[] = [
  { command: '/model-account', description: 'Select provider, model and account' },
  { command: '/prompt-config', description: 'Configure prompt length, style & skill' },
  { command: '/analytic', description: 'Show session usage statistics' },
  { command: '/new', description: 'Start a new conversation' },
  { command: '/history', description: 'View conversation list' },
  { command: '/setting', description: 'Open settings' },
  { command: '/account', description: 'Manage account' },
  { command: '/add-account', description: 'Add a new account' },
  { command: '/skill', description: 'Manage installed skills' },
  { command: '/add-skill', description: 'Install a new skill from marketplace' },
  { command: '/import-account', description: 'Import accounts from JSON/YAML file' },
  { command: '/exit', description: 'Exit application' },
]

interface CommandListProps {
  onSelect?: (command: string) => void
  onClose?: () => void
}

/**
 * Command list panel displayed below TextInput when user types "/"
 * as the first character. Supports ↑↓ navigation and Enter to select.
 */
export function CommandList({
  onSelect,
  onClose,
}: CommandListProps): React.JSX.Element {
  const [cursorIndex, setCursorIndex] = useState(0)

  const commands: CommandEntry[] = [...STATIC_COMMANDS]

  useInput((input, key) => {
    if (key.escape) {
      onClose?.()
      return
    }
    
    if (key.upArrow) {
      setCursorIndex(prev => (prev <= 0 ? commands.length - 1 : prev - 1))
    } else if (key.downArrow) {
      setCursorIndex(prev => (prev >= commands.length - 1 ? 0 : prev + 1))
    } else if (key.return) {
      const selectedCmd = commands[cursorIndex]
      // Unified flow: Always send command string via onSelect
      onSelect?.(selectedCmd.command)
    }
  })

  return (
    <Box flexDirection="column" paddingX={1} marginTop={0}>
      {commands.map((entry, i) => {
        const isSelected = i === cursorIndex
        const textColor = isSelected ? 'cyan' : 'gray'
        
        return (
          <Box key={`${entry.command}-${i}`}>
            <Box width={20}>
              <Text color={textColor}>
                {isSelected ? '❯ ' : '  '}
                {entry.command}
              </Text>
            </Box>
            
            <Text color={textColor}>{entry.description}</Text>
          </Box>
        )
      })}
    </Box>
  )
}