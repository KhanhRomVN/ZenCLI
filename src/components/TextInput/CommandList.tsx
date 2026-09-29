import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

interface CommandEntry {
  command: string
  description: string | ((state?: any) => React.ReactNode) // Support dynamic rendering for toggles
  type?: 'static' | 'toggle-diag' | 'toggle-skill' | 'cycle-prompt' | 'cycle-style'
}

// Base commands that don't change based on state
const STATIC_COMMANDS: CommandEntry[] = [
  { command: '/model-account', description: 'Select provider, model and account', type: 'static' },
  { command: '/new', description: 'Start a new conversation', type: 'static' },
  { command: '/history', description: 'View conversation list', type: 'static' },
  { command: '/setting', description: 'Open settings', type: 'static' },
  { command: '/account', description: 'Manage account', type: 'static' },
  { command: '/exit', description: 'Exit application', type: 'static' },
]

type PromptLength = 'none' | 'short' | 'medium' | 'long';
type CodeStyle = 'standard' | 'functional' | 'oop';

interface CommandListProps {
  onSelect?: (command: string) => void
  onClose?: () => void
  onToggleDiagnostic?: () => void
  onToggleSkill?: () => void
  onCyclePromptLength?: () => void
  onCycleCodeStyle?: () => void
  diagnosticsEnabled: boolean
  skillsEnabled: boolean
  promptLength: PromptLength
  codeStyle: CodeStyle
}

/**
 * Command list panel displayed below TextInput when user types "/"
 * as the first character. Supports ↑↓ navigation and Enter to select/toggle.
 */
export function CommandList({
  onSelect,
  onClose,
  onToggleDiagnostic,
  onToggleSkill,
  onCyclePromptLength,
  onCycleCodeStyle,
  diagnosticsEnabled,
  skillsEnabled,
  promptLength,
  codeStyle,
}: CommandListProps): React.JSX.Element {
  const [cursorIndex, setCursorIndex] = useState(0)

  // Construct full command list dynamically including current states
  const commands: CommandEntry[] = [
    STATIC_COMMANDS[0], // /model-account
    
    // Dynamic Runtime Commands
    { 
      command: '/prompt-length', 
      type: 'cycle-prompt',
      description: () => (
        <Text>
          Cycle/set prompt length (
          <Text bold color={promptLength === 'none' ? 'gray' : promptLength === 'short' ? 'blue' : promptLength === 'medium' ? 'green' : 'yellow'}>
            {promptLength.toUpperCase()}
          </Text>
          {promptLength === 'none' && <Text dimColor> - hides other settings</Text>}
          )
        </Text>
      )
    },
    { 
      command: '/style-code', 
      type: 'cycle-style',
      description: () => (
        <Text>
          Cycle/set code style (<Text bold color="magenta">{codeStyle.toUpperCase()}</Text>)
        </Text>
      )
    },
    { 
      command: '/diagnostic', 
      type: 'toggle-diag',
      description: () => (
        <Text>
          Toggle diagnostics [<Text bold color={diagnosticsEnabled ? 'green' : 'red'}>{diagnosticsEnabled ? 'ON' : 'OFF'}</Text>]
        </Text>
      )
    },
    { 
      command: '/skill', 
      type: 'toggle-skill',
      description: () => (
        <Text>
          Toggle skills [<Text bold color={skillsEnabled ? 'cyan' : 'gray'}>{skillsEnabled ? 'ON' : 'OFF'}</Text>]
        </Text>
      )
    },

    ...STATIC_COMMANDS.slice(1), // Rest of static commands (/new, /history...)
  ]

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
      
      // Handle specific actions for toggle/cycle commands
      switch (selectedCmd.type) {
        case 'toggle-diag':
          onToggleDiagnostic?.()
          break
        case 'toggle-skill':
          onToggleSkill?.()
          break
        case 'cycle-prompt':
          onCyclePromptLength?.()
          break
        case 'cycle-style':
          onCycleCodeStyle?.()
          break
        default:
          // For static commands, forward to parent handler
          onSelect?.(selectedCmd.command)
          break
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
            
            {/* Render Description: either static string or dynamic JSX */}
            {typeof entry.description === 'function' ? (
              <Text color={textColor}>{entry.description()}</Text>
            ) : (
              <Text color={textColor}>{entry.description}</Text>
            )}
          </Box>
        )
      })}
    </Box>
  )
}