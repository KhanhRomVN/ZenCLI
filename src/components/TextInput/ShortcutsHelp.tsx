import React from 'react'
import { Box, Text } from 'ink'

interface ShortcutEntry {
  key: string
  description: string
}

const SHORTCUTS: ShortcutEntry[] = [
  { key: '! for shell mode', description: 'double tap esc to clear input' },
  { key: '/ for commands', description: 'shift + tab to auto-accept edits' },
  { key: '@ for file paths', description: 'ctrl + o for verbose output' },
  { key: '/btw for side question', description: 'ctrl + t to toggle tasks' },
  { key: '', description: 'ctrl + shift + _ to undo' },
  { key: '', description: 'ctrl + v to paste images' },
  { key: '', description: 'alt + p to switch model' },
  { key: '', description: 'ctrl + s to stash prompt' },
  { key: '', description: 'backslash (\\) + return (⏎) for newline' },
]

/**
 * Keyboard shortcuts help panel displayed below TextInput when user types "?"
 * as the first character. Toggle on/off by typing "?" again at position 0.
 */
export function ShortcutsHelp(): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingX={1} marginTop={0}>
      {SHORTCUTS.map((entry, i) => (
        <Box key={i}>
          <Box width={30}>
            <Text color="cyan">{entry.key}</Text>
          </Box>
          <Text dimColor>{entry.description}</Text>
        </Box>
      ))}
    </Box>
  )
}