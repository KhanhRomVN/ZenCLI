import { useState, useEffect } from 'react'
import ChatPage from '../pages/Chat'
import TerminalPage from '../pages/Terminal'
import { ConversationProvider } from '../providers/conversation-provider'

type ViewMode = 'gui' | 'cli'

const MainLayout = () => {
  const [mode, setMode] = useState<ViewMode>('gui')

  useEffect(() => {
    const handleModeChange = (event: CustomEvent<string>) => {
      setMode(event.detail as ViewMode)
    }

    window.addEventListener('mode-change', handleModeChange as EventListener)
    return () => {
      window.removeEventListener('mode-change', handleModeChange as EventListener)
    }
  }, [])

  return (
    <ConversationProvider>
      <div className="flex min-h-screen bg-sidebar-background">
        {/* Main content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 min-h-0 bg-background rounded-xl overflow-hidden">
            {mode === 'gui' ? <ChatPage /> : <TerminalPage />}
          </div>
        </div>
      </div>
    </ConversationProvider>
  )
}

export default MainLayout
