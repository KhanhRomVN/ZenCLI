import React, { useState } from 'react'
import { Box } from 'ink'
import { ChatScreen } from './ChatScreen.js'
import { ErrorScreen } from './ErrorScreen.js'

type Screen = 'chat' | 'error'

/**
 * Root application component — manages top-level screen routing and layout.
 * Welcome banner is rendered inside ChatScreen (shown when no messages exist).
 */
export function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('chat')
  const [error, setError] = useState<string | null>(null)

  const handleError = (message: string): void => {
    setError(message)
    setScreen('error')
  }

  const handleRecoverFromError = (): void => {
    setError(null)
    setScreen('chat')
  }

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box flexGrow={1}>
        {screen === 'chat' && <ChatScreen onError={handleError} />}
        {screen === 'error' && <ErrorScreen message={error} onRecover={handleRecoverFromError} />}
      </Box>
    </Box>
  )
}