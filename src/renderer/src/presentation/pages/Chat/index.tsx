import { useState, useEffect, useRef } from 'react'
import { Step } from '../../../types/providers/claude'
import { useConversation } from '../../providers/conversation-provider'
import {
  Textarea,
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem
} from '@khanhromvn/zenui'
import { CornerDownRight, ChevronDown } from 'lucide-react'

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
  conversationId?: string
  parentMessageUuid?: string
  timestamp?: number
}

export default function ChatPage() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    // Load tabs from localStorage on mount
    try {
      const savedTabs = localStorage.getItem('zencli-tabs')
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs)
        return Array.isArray(parsed) && parsed.length > 0
          ? parsed
          : [{ id: '1', name: 'Chat 1', timestamp: Date.now() }]
      }
    } catch (error) {
      console.error('Failed to load tabs from localStorage:', error)
    }
    return [{ id: '1', name: 'Chat 1', timestamp: Date.now() }]
  })

  const [activeTabId, setActiveTabId] = useState(() => {
    // Load active tab ID from localStorage
    try {
      const savedActiveTabId = localStorage.getItem('zencli-active-tab')
      if (savedActiveTabId && tabs.find((t) => t.id === savedActiveTabId)) {
        return savedActiveTabId
      }
    } catch (error) {
      console.error('Failed to load active tab ID:', error)
    }
    return tabs[0]?.id || '1'
  })

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-5-20250929')
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' }
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    setConversationId,
    setParentMessageUuid,
    addMessage,
    updateLastMessage,
    clearMessages,
    loadConversationHistory
  } = useConversation()

  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('zencli-tabs', JSON.stringify(tabs))
    } catch (error) {
      console.error('Failed to save tabs to localStorage:', error)
    }
  }, [tabs])

  // Save active tab ID to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('zencli-active-tab', activeTabId)
    } catch (error) {
      console.error('Failed to save active tab ID:', error)
    }
  }, [activeTabId])

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
    loadAvailableModels()
  }, [])

  // Load available models
  const loadAvailableModels = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('claude:get-available-models')
      if (result.success && result.models) {
        setAvailableModels(result.models)
      }
    } catch (error) {
      console.error('Failed to load available models:', error)
    }
  }

  // Load conversation history when switching tabs
  useEffect(() => {
    if (activeTab?.conversationId) {
      loadConversationHistory(activeTab.conversationId)
    } else {
      clearMessages()
    }
  }, [activeTabId])

  const checkAuth = async () => {
    try {
      const authenticated = await window.electron.ipcRenderer.invoke('claude:get-auth-status')
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
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !activeTab) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    // Add user message
    addMessage(userMessage)
    setInput('')
    setIsStreaming(true)

    try {
      // Create conversation if needed and get the IDs
      let conversationId = activeTab.conversationId
      let parentMessageUuid = activeTab.parentMessageUuid

      if (!conversationId) {
        const createResult = await window.electron.ipcRenderer.invoke(
          'claude:create-conversation',
          selectedModel
        )
        conversationId = createResult.conversationId
        parentMessageUuid = createResult.parentMessageUuid

        // Update tab with conversation info
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeTabId
              ? {
                  ...tab,
                  conversationId,
                  parentMessageUuid
                }
              : tab
          )
        )

        // Update context
        setConversationId(conversationId!)
        setParentMessageUuid(parentMessageUuid!)
      }

      // Prepare assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        steps: [],
        timestamp: Date.now()
      }

      addMessage(assistantMessage)

      // Listen for stream chunks
      const handleStreamChunk = (_event: any, data: { text: string; steps: Step[] }) => {
        updateLastMessage(data.text)
      }

      window.electron.ipcRenderer.on('claude:stream-chunk', handleStreamChunk)

      // Send message using the local variables (not state)
      await window.electron.ipcRenderer.invoke('claude:send-message', {
        conversationId,
        parentMessageUuid,
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
    const newId = (tabs.length + 1).toString()
    setTabs([...tabs, { id: newId, name: `Chat ${newId}`, timestamp: Date.now() }])
    setActiveTabId(newId)
    clearMessages()
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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
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
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">✦</div>
            <p className="text-xl font-medium mb-2">What can I help with?</p>
            <span className="text-gray-500">Claude is ready</span>
          </div>
        ) : (
          <div className="w-full px-4 space-y-4">
            {messages.map((message) => (
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
      <div className="w-full p-2 space-y-3 ">
        {/* Badges Row */}
        <div className="flex items-center gap-2">
          {/* Model Selector Dropdown */}
          <Dropdown>
            <DropdownTrigger>
              <button className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                <span>🤖</span>
                <span>
                  {availableModels.find((m) => m.id === selectedModel)?.name || 'Claude Sonnet 4.5'}
                </span>
                <ChevronDown size={12} />
              </button>
            </DropdownTrigger>
            <DropdownContent className="bg-dropdown-background border border-dropdown-border">
              {availableModels.map((model) => (
                <DropdownItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`hover:bg-dropdown-itemHover ${
                    selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {model.name}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>

          {/* Mode Toggle Badges */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const event = new CustomEvent('mode-change', { detail: 'gui' })
                window.dispatchEvent(event)
              }}
              className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            >
              GUI
            </button>
            <button
              onClick={() => {
                const event = new CustomEvent('mode-change', { detail: 'cli' })
                window.dispatchEvent(event)
              }}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              CLI
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />
        </div>

        {/* Textarea */}
        <Textarea
          value={input}
          onChange={(value) => setInput(value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Message Claude..."
          className="!w-full border border-input-border-default bg-input-background hover:border-input-border-hover rounded-md"
          style={{ width: '100%' }}
          minRows={2}
          maxRows={10}
          disabled={isStreaming}
          resize="none"
          bottomWrapper={
            <div className="flex items-center justify-end">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="flex items-center gap-2 p-2 bg-button-bg hover:bg-button-bgHover text-button-bgText border border-button-border hover:border-button-borderHover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message (Enter)"
              >
                <CornerDownRight size={14} />
              </button>
            </div>
          }
        />
      </div>
    </div>
  )
}
