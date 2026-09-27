import React, { useState } from 'react'
import { Box, Text } from 'ink'
import { TextInput } from './TextInput.js'
import { ShortcutsHelp } from './ShortcutsHelp.js'
import { WelcomeSection } from './WelcomeSection.js'

interface ChatScreenProps {
  onError: (message: string) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Main chat screen with welcome banner, message list, input box, and status bar.
 * Uses @inkjs/ui TextInput for proper terminal input (paste, cursor, backspace).
 * Currently UI-only — no AI integration yet.
 */
export function ChatScreen({ onError }: ChatScreenProps): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([])
  const [shortcutsVisible, setShortcutsVisible] = useState(false)

  const handleSubmit = (value: string): void => {
    if (value.trim().length === 0) return
    setMessages(prev => [
      ...prev,
      { role: 'user', content: value.trim() },
      { role: 'assistant', content: '(AI response placeholder)' },
    ])
  }

  // Suppress unused-variable warning — onError is wired for future error handling
  void onError

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Welcome section — always visible at top */}
      <WelcomeSection />

      {/* Separator line */}
      <Text>{'─'.repeat(process.stdout.columns || 80)}</Text>

      {/* Input area — custom IME-aware TextInput */}
      <TextInput
        onSubmit={handleSubmit}
        placeholder="Type a message..."
        onShortcutsToggle={setShortcutsVisible}
      />

      {/* Separator line */}
      <Text>{'─'.repeat(process.stdout.columns || 80)}</Text>

      {/* Shortcuts help panel — rendered outside TextInput, between separators */}
      {shortcutsVisible && <ShortcutsHelp />}

      {/* Status bar — hidden when shortcuts panel is active */}
      {!shortcutsVisible && (
        <Box paddingX={1}>
          <Text dimColor>? for shortcuts</Text>
        </Box>
      )}

      {/* Message list */}
      {messages.length > 0 && (
        <Box flexDirection="column" marginTop={1} paddingX={1}>
          {messages.map((msg, i) => (
            <Box key={i} marginBottom={0}>
              <Text bold color={msg.role === 'user' ? 'green' : 'yellow'}>
                {msg.role === 'user' ? 'You' : 'Zen'}:{' '}
              </Text>
              <Text>{msg.content}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}