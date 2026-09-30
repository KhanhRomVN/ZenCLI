import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

interface CommandEntry {
  command: string
  description: string
  type?: 'static' | 'open-prompt-config'
}

// Base commands that don't change based on state
const STATIC_COMMANDS: CommandEntry[] = [
  { command: '/model-account', description: 'Select provider, model and account', type: 'static' },
  { command: '/prompt-config', description: 'Configure prompt length, style, diagnostic & skill', type: 'open-prompt-config' },
  { command: '/analytic', description: 'Show session usage statistics', type: 'static' },
  { command: '/new', description: 'Start a new conversation', type: 'static' },
  { command: '/history', description: 'View conversation list', type: 'static' },
  { command: '/setting', description: 'Open settings', type: 'static' },
  { command: '/account', description: 'Manage account', type: 'static' },
  { command: '/exit', description: 'Exit application', type: 'static' },
]

interface CommandListProps {
  onSelect?: (command: string) => void
  onClose?: () => void
  onOpenPromptConfig?: () => void
}

/**
 * Command list panel displayed below TextInput when user types "/"
 * as the first character. Supports ↑↓ navigation and Enter to select.
 */
export function CommandList({
  onSelect,
  onClose,
  onOpenPromptConfig,
}: CommandListProps): React.JSX.Element {
  const [cursorIndex, setCursorIndex] = useState(0)

  const commands: CommandEntry[] = [...STATIC_COMMANDS]

  useInput((input, key) => {
    if (key.escape) {
      onClose?.()
      return
    }
    
    if (key.upArrow) {
      setCursorIndex(prev => Math.max(0, prev - 1))
    } else if (key.downArrow) {
      setCursorIndex(prev => Math.min(commands.length - 1, prev + 1))
    } else if (key.return) {
      const selectedCmd = commands[cursorIndex]
      
      if (selectedCmd.type === 'open-prompt-config') {
        onOpenPromptConfig?.()
      } else {
        onSelect?.(selectedCmd.command)
      }
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