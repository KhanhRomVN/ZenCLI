import { useState, useEffect, useRef } from 'react'
import { Step } from '../../types/claude'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: Step[]
  timestamp: number
}

interface Tab {
  id: string
  name: string
  messages: Message[]
  conversationId?: string
  parentMessageUuid?: string
}

export default function ClaudeChatPage() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'Chat 1', messages: [], timestamp: Date.now() }
  ])
  const [activeTabId, setActiveTabId] = useState('1')
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const authenticated = await window.electron.ipcRenderer.invoke('claude:get-auth-status')
      setIsAuthenticated(authenticated)
      if (!authenticated) {
        setShowLoginModal(true)
      }
    } catch (error) {
      console.error('Failed to check auth status:', error)
      setShowLoginModal(true)
    }
  }

  const handleLogin = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('claude:login')
      if (result.success) {
        setIsAuthenticated(true)
        setShowLoginModal(false)
      } else {
        console.error('Login failed:', result.error)
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeTab?.messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !activeTab) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    // Add user message
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, messages: [...tab.messages, userMessage] } : tab
      )
    )

    setInput('')
    setIsStreaming(true)

    try {
      // Create conversation if needed
      if (!activeTab.conversationId) {
        const createResult = await window.electron.ipcRenderer.invoke('claude:create-conversation')
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeTabId
              ? {
                  ...tab,
                  conversationId: createResult.conversationId,
                  parentMessageUuid: createResult.parentMessageUuid
                }
              : tab
          )
        )
      }

      // Prepare assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        steps: [],
        timestamp: Date.now()
      }

      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, messages: [...tab.messages, assistantMessage] } : tab
        )
      )

      // Listen for stream chunks
      const handleStreamChunk = (_event: any, data: { text: string; steps: Step[] }) => {
        setTabs((prev) =>
          prev.map((tab) => {
            if (tab.id !== activeTabId) return tab
            const updatedMessages = [...tab.messages]
            const lastMessage = updatedMessages[updatedMessages.length - 1]
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = data.text
              lastMessage.steps = data.steps
            }
            return { ...tab, messages: updatedMessages }
          })
        )
      }

      window.electron.ipcRenderer.on('claude:stream-chunk', handleStreamChunk)

      // Send message
      await window.electron.ipcRenderer.invoke('claude:send-message', {
        conversationId: activeTab.conversationId,
        parentMessageUuid: activeTab.parentMessageUuid,
        message: userMessage.content
      })

      window.electron.ipcRenderer.removeListener('claude:stream-chunk', handleStreamChunk)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsStreaming(false)
    }
  }

  const createNewTab = () => {
    if (tabs.length >= 3) return
    const newTab: Tab = {
      id: Date.now().toString(),
      name: `Chat ${tabs.length + 1}`,
      messages: [],
      timestamp: Date.now()
    }
    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
  }

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return
    const newTabs = tabs.filter((t) => t.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id)
    }
  }

  if (showLoginModal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Welcome to Claude</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Sign in to get started</p>
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Sign in with Claude
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Tab Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 flex-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                activeTabId === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {tabs.length < 3 && (
          <button
            onClick={createNewTab}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + New Tab
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab?.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">✦</div>
            <p className="text-xl font-medium mb-2">What can I help with?</p>
            <span className="text-gray-500">Claude is ready</span>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {activeTab?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="flex-1">
                  <div className="prose dark:prose-invert max-w-none">
                    {message.content || <span className="text-gray-400 italic">Thinking...</span>}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Message Claude..."
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
            >
              {isStreaming ? '⏸' : '↑'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
