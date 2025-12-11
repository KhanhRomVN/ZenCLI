import { useState, useEffect, useRef } from 'react'
import { Step } from '../../../types/providers/claude'
import { useConversation } from '../../providers/conversation-provider'
import {
  Textarea,
  Button,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem
} from '@khanhromvn/zenui'
import { CornerDownRight, ChevronDown, X } from 'lucide-react'
import SelectAccountModal from './components/SelectAccountModal'
import TerminalPage from '../Terminal'

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
  timestamp: number
  username: string
  accountId: string
  mode: 'gui' | 'cli'
  selectedModel: string
  input: string // Per-tab input
  isStreaming: boolean // Per-tab streaming state
  messages: Message[] // Per-tab messages
}

interface Account {
  id: string
  name: string
  email?: string
  orgId: string
}

export default function ChatPage() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [conversations, setConversations] = useState<
    Record<string, Array<{ uuid: string; name: string }>>
  >({})
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' }
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { setConversationId, setParentMessageUuid } = useConversation()

  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Check authentication and load initial data
  useEffect(() => {
    checkAuth()
    loadAvailableModels()
    loadAccounts()

    // Try loading state from local storage
    const savedTabs = localStorage.getItem('zencli:tabs')
    const savedActiveTabId = localStorage.getItem('zencli:activeTabId')

    if (savedTabs && savedActiveTabId) {
      try {
        const parsedTabs = JSON.parse(savedTabs)
        if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
          // Ensure all tabs have messages array (migration for old saved data)
          const migratedTabs = parsedTabs.map((tab) => ({
            ...tab,
            messages: tab.messages || []
          }))
          setTabs(migratedTabs)
          setActiveTabId(savedActiveTabId)
          console.log(`[Tab Restore] Loaded ${migratedTabs.length} tabs from localStorage`)

          // Load conversations for each unique account
          const uniqueAccountIds = [...new Set(migratedTabs.map((tab) => tab.accountId))]
          console.log('[Tab Restore] Loading conversations for accounts:', uniqueAccountIds)
          uniqueAccountIds.forEach((accountId) => {
            loadConversationsForAccount(accountId)
          })

          return
        }
      } catch (e) {
        console.error('Failed to parse saved tabs:', e)
      }
    }

    // Fallback to initial tab if no saved state
    loadInitialTab()
  }, [])

  // Save state to local storage
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem('zencli:tabs', JSON.stringify(tabs))
    }
    if (activeTabId) {
      localStorage.setItem('zencli:activeTabId', activeTabId)
    }
  }, [tabs, activeTabId])

  // Ctrl+T hotkey to open account modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault()
        if (tabs.length < 3) {
          setShowAccountModal(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs.length])

  // Load conversation history when switching tabs
  useEffect(() => {
    if (activeTab?.conversationId && (!activeTab.messages || activeTab.messages.length === 0)) {
      // Only load if we don't have messages cached in the tab
      loadConversationHistoryForTab(activeTab.conversationId, activeTabId)
    }
  }, [activeTabId])

  const loadConversationHistoryForTab = async (convId: string, tabId: string) => {
    try {
      const result = await window.electron.ipcRenderer.invoke(
        'claude:get-conversation-messages',
        convId
      )

      if (result.success && Array.isArray(result.messages)) {
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  messages: result.messages,
                  parentMessageUuid: result.parentMessageUuid || tab.parentMessageUuid
                }
              : tab
          )
        )
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error)
    }
  }

  const loadInitialTab = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('claude:get-active-account')
      if (result.success && result.account) {
        const { id, name } = result.account
        const newTab: Tab = {
          id: '1',
          name: name,
          username: name,
          accountId: id,
          mode: 'gui',
          selectedModel: 'claude-sonnet-4-5-20250929',
          timestamp: Date.now(),
          input: '',
          isStreaming: false,
          messages: []
        }
        setTabs([newTab])
        setActiveTabId('1')
        // Load conversations for this account
        console.log('[Init] Loading conversations for initial account:', id)
        loadConversationsForAccount(id)
      }
    } catch (error) {
      console.error('Failed to load initial tab:', error)
    }
  }

  const loadConversationsForAccount = async (accountId: string) => {
    try {
      console.log('[Conversations] Loading conversations for account:', accountId)
      const result = await window.electron.ipcRenderer.invoke('claude:get-conversations')
      console.log('[Conversations] API result:', result)
      if (result.success && Array.isArray(result.conversations)) {
        const convList = result.conversations.slice(0, 20).map((c: any) => ({
          uuid: c.uuid,
          name: c.name || 'Untitled conversation'
        }))
        console.log('[Conversations] Processed conversation list:', convList)
        setConversations((prev) => {
          const updated = {
            ...prev,
            [accountId]: convList
          }
          console.log('[Conversations] Updated conversations state:', updated)
          return updated
        })
      } else {
        console.warn('[Conversations] Failed to load or no conversations:', result)
      }
    } catch (error) {
      console.error('[Conversations] Error loading conversations:', error)
    }
  }

  const handleSwitchConversation = (tabId: string, conversationId: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? { ...tab, conversationId, messages: [], parentMessageUuid: undefined }
          : tab
      )
    )
    // Load conversation history
    loadConversationHistoryForTab(conversationId, tabId)
  }

  const handleNewChat = (tabId: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? { ...tab, conversationId: undefined, parentMessageUuid: undefined, messages: [] }
          : tab
      )
    )
  }

  const handleSwitchTabAccount = async (tabId: string, newAccountId: string) => {
    const account = accounts.find((a) => a.id === newAccountId)
    if (!account) return

    // Check if account is already in use by another tab
    const isDuplicate = tabs.some((tab) => tab.id !== tabId && tab.accountId === newAccountId)
    if (isDuplicate) {
      alert(`Account "${account.name}" is already open in another tab!`)
      return
    }

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              accountId: newAccountId,
              username: account.name,
              conversationId: undefined,
              parentMessageUuid: undefined,
              messages: []
            }
          : tab
      )
    )

    // Load conversations for new account
    loadConversationsForAccount(newAccountId)
  }

  const loadAccounts = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('claude:get-accounts')
      if (result.success && result.accounts) {
        setAccounts(result.accounts)
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  }

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
        await loadAccounts()
        await loadInitialTab()
      } else {
        console.error('Login failed:', result.error)
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  const handleAddAccount = async () => {
    try {
      console.log('[Frontend] Starting add account flow...')
      const result = await window.electron.ipcRenderer.invoke('claude:login')
      console.log('[Frontend] Login result:', result)
      if (result.debug) {
        console.log('[Frontend] Login Debug Info:', result.debug)
      }

      if (result.success) {
        // Reload accounts list to get the newly added account
        console.log('[Frontend] Reloading accounts...')
        await loadAccounts()

        // Get fresh accounts list
        const accountsResult = await window.electron.ipcRenderer.invoke('claude:get-accounts')
        console.log('[Frontend] Accounts result:', accountsResult)

        if (accountsResult.success && accountsResult.accounts) {
          console.log('[Frontend] Total accounts:', accountsResult.accounts.length)
          // Find the newly added account (last one in the list)
          const newAccount = accountsResult.accounts[accountsResult.accounts.length - 1]
          console.log('[Frontend] New account:', newAccount)

          // Check if this account is already in use
          console.log(
            '[Frontend] Current tabs:',
            tabs.map((t) => ({ id: t.id, accountId: t.accountId }))
          )
          const isDuplicate = tabs.some((tab) => tab.accountId === newAccount.id)
          console.log('[Frontend] Is duplicate?', isDuplicate)

          if (!isDuplicate) {
            console.log('[Frontend] Creating new tab for account:', newAccount.id)
            handleSelectAccount(newAccount.id)
          } else {
            console.warn('[Tab] Newly logged in account is already in use')
            alert(`Account "${newAccount.name}" is already open in a tab!`)
          }
        } else {
          console.error('[Frontend] Failed to get accounts or no accounts returned')
        }
        setShowAccountModal(false)
      } else {
        console.log('[Frontend] Login was not successful:', result.error)
      }
    } catch (error) {
      console.error('Failed to add account:', error)
    }
  }

  const handleRemoveAccount = async (accountId: string) => {
    if (confirm('Are you sure you want to remove this account?')) {
      try {
        const result = await window.electron.ipcRenderer.invoke('claude:remove-account', accountId)
        if (result.success) {
          await loadAccounts()
          // If the active tab was using this account, switch or close?
          // Current logic in main process switches active account if active one is removed.
          // Frontend should probably update tabs if they are using the removed account.
          // For now, let's just reload tabs/accounts.
          if (tabs.some((t) => t.accountId === accountId)) {
            // Maybe close tabs that use this account?
            // Simple approach: reload initial tab to recover
            if (tabs.length === 1 && tabs[0].accountId === accountId) {
              await loadInitialTab()
            }
          }
        } else {
          console.error('Failed to remove account:', result.error)
        }
      } catch (error) {
        console.error('Error removing account:', error)
      }
    }
  }

  const handleSelectAccount = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return

    // Check if account is already in use by another tab
    const isDuplicate = tabs.some((tab) => tab.accountId === accountId)
    if (isDuplicate) {
      console.error('[Tab] Account already in use:', accountId)
      alert(`Account "${account.name}" is already open in another tab!`)
      return
    }

    const newId = (tabs.length + 1).toString()
    const newTab: Tab = {
      id: newId,
      name: account.name,
      username: account.name,
      accountId: account.id,
      mode: 'gui',
      selectedModel: 'claude-sonnet-4-5-20250929',
      timestamp: Date.now(),
      input: '',
      isStreaming: false,
      messages: []
    }

    setTabs([...tabs, newTab])
    setActiveTabId(newId)

    // Load conversations for the new account
    console.log('[AddTab] Loading conversations for new tab account:', account.id)
    loadConversationsForAccount(account.id)
    setShowAccountModal(false)
  }

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return
    const newTabs = tabs.filter((t) => t.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id)
    }
  }

  const updateTabMode = (mode: 'gui' | 'cli') => {
    if (!activeTab) return
    setTabs((prev) => prev.map((tab) => (tab.id === activeTabId ? { ...tab, mode } : tab)))
  }

  const updateTabModel = (modelId: string) => {
    if (!activeTab) return
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, selectedModel: modelId } : tab))
    )
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeTab?.messages])

  const handleSend = async () => {
    if (!activeTab || !activeTab.input.trim() || activeTab.isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: activeTab.input.trim(),
      timestamp: Date.now()
    }

    // Add user message to active tab's messages
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, messages: [...tab.messages, userMessage], input: '', isStreaming: true }
          : tab
      )
    )

    try {
      let conversationId = activeTab.conversationId
      let parentMessageUuid = activeTab.parentMessageUuid

      if (!conversationId) {
        const createResult = await window.electron.ipcRenderer.invoke(
          'claude:create-conversation',
          activeTab.selectedModel
        )
        conversationId = createResult.conversationId
        parentMessageUuid = createResult.parentMessageUuid

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

        setConversationId(conversationId!)
        setParentMessageUuid(parentMessageUuid!)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        steps: [],
        timestamp: Date.now()
      }

      // Add assistant message placeholder to active tab
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, messages: [...tab.messages, assistantMessage] } : tab
        )
      )

      const handleStreamChunk = (_event: any, data: { text: string; steps: Step[] }) => {
        // Update last message in active tab's messages
        setTabs((prev) =>
          prev.map((tab) => {
            if (tab.id !== activeTabId) return tab
            const updatedMessages = [...tab.messages]
            if (updatedMessages.length > 0) {
              updatedMessages[updatedMessages.length - 1] = {
                ...updatedMessages[updatedMessages.length - 1],
                content: data.text
              }
            }
            return { ...tab, messages: updatedMessages }
          })
        )
      }

      window.electron.ipcRenderer.on('claude:stream-chunk', handleStreamChunk)

      await window.electron.ipcRenderer.invoke('claude:send-message', {
        conversationId,
        parentMessageUuid,
        message: userMessage.content
      })

      window.electron.ipcRenderer.removeListener('claude:stream-chunk', handleStreamChunk)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      // Clear streaming state for active tab
      setTabs((prev) =>
        prev.map((tab) => (tab.id === activeTabId ? { ...tab, isStreaming: false } : tab))
      )
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
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Account Switcher Modal */}
      <SelectAccountModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        accounts={accounts}
        usedAccountIds={tabs.map((t) => t.accountId)}
        onSelectAccount={handleSelectAccount}
        onAddAccount={handleAddAccount}
        onRemoveAccount={handleRemoveAccount}
      />

      {/* Split View - Render all tabs side-by-side */}
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          className={`flex flex-col flex-1 ${
            activeTabId === tab.id
              ? 'border-2 border-primary'
              : 'border-r border-border-default last:border-r-0'
          } transition-all`}
          onClick={() => setActiveTabId(tab.id)}
        >
          {/* Tab Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-card-background border-b border-border-default">
            {/* Left: Username with account switcher dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {tab.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-text-primary text-sm">{tab.username}</span>
                  <ChevronDown size={12} />
                </button>
              </DropdownTrigger>
              <DropdownContent className="bg-dropdown-background border border-dropdown-border min-w-[200px]">
                {accounts
                  .filter((acc) => !tabs.some((t) => t.accountId === acc.id))
                  .map((account) => (
                    <DropdownItem
                      key={account.id}
                      onClick={() => handleSwitchTabAccount(tab.id, account.id)}
                      className="hover:bg-dropdown-itemHover"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                          {account.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{account.name}</span>
                      </div>
                    </DropdownItem>
                  ))}
                {accounts.filter((acc) => !tabs.some((t) => t.accountId === acc.id)).length ===
                  0 && (
                  <div className="px-3 py-2 text-sm text-text-secondary">All accounts in use</div>
                )}
              </DropdownContent>
            </Dropdown>

            {/* Center: Conversation title dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-2 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors max-w-[300px]">
                  <span className="text-sm text-text-primary truncate">
                    {(() => {
                      const convTitle = tab.conversationId
                        ? conversations[tab.accountId]?.find((c) => c.uuid === tab.conversationId)
                            ?.name || 'Current conversation'
                        : 'New conversation'
                      console.log(
                        '[ConvDropdown] Tab:',
                        tab.id,
                        'ConvId:',
                        tab.conversationId,
                        'AccountId:',
                        tab.accountId,
                        'Title:',
                        convTitle,
                        'Conversations:',
                        conversations[tab.accountId]
                      )
                      return convTitle
                    })()}
                  </span>
                  <ChevronDown size={12} />
                </button>
              </DropdownTrigger>
              <DropdownContent className="bg-dropdown-background border border-dropdown-border min-w-[250px] max-h-[200px] overflow-y-auto">
                {conversations[tab.accountId]?.slice(0, 5).map((conv) => (
                  <DropdownItem
                    key={conv.uuid}
                    onClick={() => handleSwitchConversation(tab.id, conv.uuid)}
                    className={`hover:bg-dropdown-itemHover ${conv.uuid === tab.conversationId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <span className="truncate">{conv.name}</span>
                  </DropdownItem>
                ))}
                {(!conversations[tab.accountId] || conversations[tab.accountId].length === 0) && (
                  <div className="px-3 py-2 text-sm text-text-secondary">No conversations yet</div>
                )}
              </DropdownContent>
            </Dropdown>

            {/* Right: New chat button and close button */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNewChat(tab.id)
                }}
                className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
                title="New chat"
              >
                New chat
              </button>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className="text-text-secondary hover:text-red-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          {tab.mode === 'cli' ? (
            <div className="flex-1 overflow-hidden relative">
              <TerminalPage
                messages={tab.messages}
                conversationId={tab.conversationId}
                onMessagesUpdate={(updatedMessages) => {
                  setTabs((prev) =>
                    prev.map((t) => (t.id === tab.id ? { ...t, messages: updatedMessages } : t))
                  )
                }}
                onModeChange={(mode) => updateTabMode(mode)}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                {tab.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="text-6xl mb-4">✦</div>
                    <p className="text-xl font-medium mb-2">What can I help with?</p>
                    <span className="text-gray-500">Claude is ready</span>
                    {index === 0 && (
                      <p className="text-sm text-gray-400 mt-4">Press Ctrl+T to add accounts</p>
                    )}
                  </div>
                ) : (
                  <div className="w-full px-4 space-y-4 py-4">
                    {tab.messages.map((message) => (
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
                            {message.content || (
                              <span className="text-gray-400 italic">Thinking...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="w-full p-2 space-y-3 border-t border-border-default bg-card-background">
                {/* Badges Row */}
                <div className="flex items-center gap-2">
                  {/* Model Selector Dropdown */}
                  <Dropdown>
                    <DropdownTrigger>
                      <button className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                        <span>🤖</span>
                        <span>
                          {availableModels.find((m) => m.id === tab.selectedModel)?.name ||
                            'Claude Sonnet 4.5'}
                        </span>
                        <ChevronDown size={12} />
                      </button>
                    </DropdownTrigger>
                    <DropdownContent className="bg-dropdown-background border border-dropdown-border">
                      {availableModels.map((model) => (
                        <DropdownItem
                          key={model.id}
                          onClick={() => updateTabModel(model.id)}
                          className={`hover:bg-dropdown-itemHover ${
                            tab.selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
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
                      onClick={() => updateTabMode('gui')}
                      className="px-2 py-1 rounded-md text-xs font-medium transition-colors bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    >
                      GUI
                    </button>
                    <button
                      onClick={() => updateTabMode('cli')}
                      className="px-2 py-1 rounded-md text-xs font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      CLI
                    </button>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />
                </div>

                {/* Textarea */}
                <Textarea
                  value={tab.input}
                  onChange={(value) => {
                    // Update per-tab input
                    setTabs(tabs.map((t) => (t.id === tab.id ? { ...t, input: value } : t)))
                  }}
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
                  disabled={tab.isStreaming}
                  resize="none"
                  bottomWrapper={
                    <div className="flex items-center justify-end">
                      <button
                        onClick={handleSend}
                        disabled={!tab.input.trim() || tab.isStreaming}
                        className="flex items-center gap-2 p-2 bg-button-bg hover:bg-button-bgHover text-button-bgText border border-button-border hover:border-button-borderHover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Send message (Enter)"
                      >
                        <CornerDownRight size={14} />
                      </button>
                    </div>
                  }
                />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
