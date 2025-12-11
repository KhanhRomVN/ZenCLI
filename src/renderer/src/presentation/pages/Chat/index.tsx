import { useState, useEffect } from 'react'
import { Step } from '../../../types/providers/claude'

import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '@khanhromvn/zenui'
import { ChevronDown, X } from 'lucide-react'
import SelectAccountModal from './components/SelectAccountModal'
import TerminalView from './components/TerminalView'

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
  selectedModel: string

  messages: Message[] // Per-tab messages
  selectedFolder?: string // Selected folder path for context
  isFirstMessage: boolean // Track if this is the first message in conversation
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
          // Ensure all tabs have required fields (migration for old saved data)
          const seenIds = new Set<string>()
          const migratedTabs = parsedTabs.map((tab, index) => {
            // Ensure unique ID
            let id = tab.id
            if (!id || seenIds.has(id)) {
              id = `${Date.now()}-${index}`
            }
            seenIds.add(id)

            return {
              ...tab,
              id,
              messages: tab.messages || [],
              // Set isFirstMessage based on whether tab has messages
              // If tab has messages, it's not first message anymore
              // If tab is empty, it should be first message
              isFirstMessage:
                tab.isFirstMessage !== undefined
                  ? tab.isFirstMessage
                  : (tab.messages || []).length === 0
            }
          })
          setTabs(migratedTabs)
          setActiveTabId(savedActiveTabId)

          // Load conversations for each unique account
          const uniqueAccountIds = [...new Set(migratedTabs.map((tab) => tab.accountId))]
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
  // Ctrl+T shortkey removed in favor of UI button in TerminalView
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.ctrlKey && e.key === 't') {
  //       e.preventDefault()
  //       if (tabs.length < 3) {
  //         setShowAccountModal(true)
  //       }
  //     }
  //   }
  //   window.addEventListener('keydown', handleKeyDown)
  //   return () => window.removeEventListener('keydown', handleKeyDown)
  // }, [tabs.length])

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
          id: Date.now().toString(),
          name: name,
          username: name,
          accountId: id,
          selectedModel: 'claude-sonnet-4-5-20250929',
          timestamp: Date.now(),

          messages: [],
          isFirstMessage: true
        }
        setTabs([newTab])
        setActiveTabId('1')
        // Load conversations for this account

        loadConversationsForAccount(id)
      }
    } catch (error) {
      console.error('Failed to load initial tab:', error)
    }
  }

  const loadConversationsForAccount = async (accountId: string) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('claude:get-conversations')
      if (result.success && Array.isArray(result.conversations)) {
        const convList = result.conversations.slice(0, 20).map((c: any) => ({
          uuid: c.uuid,
          name: c.name || 'Untitled conversation'
        }))

        setConversations((prev) => {
          const updated = {
            ...prev,
            [accountId]: convList
          }

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
          ? {
              ...tab,
              conversationId,
              messages: [],
              parentMessageUuid: undefined,
              isFirstMessage: false
            }
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
          ? {
              ...tab,
              conversationId: undefined,
              parentMessageUuid: undefined,
              messages: [],
              isFirstMessage: true
            }
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
              messages: [],
              isFirstMessage: true
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
      const result = await window.electron.ipcRenderer.invoke('claude:login')

      if (result.success) {
        // Reload accounts list to get the newly added account
        await loadAccounts()

        // Get fresh accounts list
        const accountsResult = await window.electron.ipcRenderer.invoke('claude:get-accounts')

        if (accountsResult.success && accountsResult.accounts) {
          // Find the newly added account (last one in the list)
          const newAccount = accountsResult.accounts[accountsResult.accounts.length - 1]

          // Check if this account is already in use
          const isDuplicate = tabs.some((tab) => tab.accountId === newAccount.id)

          if (!isDuplicate) {
            handleSelectAccount(newAccount.id)
          } else {
            console.warn('[Tab] Newly logged in account is already in use')
            alert(`Account "${newAccount.name}" is already open in a tab!`)
          }
        } else {
          console.error('[Frontend] Failed to get accounts or no accounts returned')
        }
        setShowAccountModal(false)
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

    const newId = Date.now().toString()
    const newTab: Tab = {
      id: newId,
      name: account.name,
      username: account.name,
      accountId: account.id,
      selectedModel: 'claude-sonnet-4-5-20250929',
      timestamp: Date.now(),

      messages: [],
      isFirstMessage: true
    }

    setTabs([...tabs, newTab])
    setActiveTabId(newId)

    // Load conversations for the new account
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

  const updateTabModel = (modelId: string) => {
    if (!activeTab) return
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, selectedModel: modelId } : tab))
    )
  }

  const handleSelectFolder = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('dialog:select-folder')
      if (result.success && result.folderPath) {
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeTabId ? { ...tab, selectedFolder: result.folderPath } : tab
          )
        )
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
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
      {/* Account Switcher Modal moved to bottom */}

      {/* Split View - Render all tabs side-by-side */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex flex-col flex-1 ${
            activeTabId === tab.id
              ? 'border-2 border-primary'
              : 'border-r border-border-default last:border-r-0'
          } `}
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

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              {/* Controls moved to TerminalView */}

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

          {/* Terminal (CLI Only) */}
          <div className="flex-1 overflow-hidden relative">
            <TerminalView
              messages={tab.messages}
              conversationId={tab.conversationId}
              selectedFolder={tab.selectedFolder}
              selectedModel={tab.selectedModel}
              availableModels={availableModels}
              onMessagesUpdate={(updatedMessages) => {
                setTabs((prev) =>
                  prev.map((t) => (t.id === tab.id ? { ...t, messages: updatedMessages } : t))
                )
              }}
              onAddAccount={() => setShowAccountModal(true)}
              onSelectFolder={handleSelectFolder}
              onSelectModel={updateTabModel}
            />
          </div>
        </div>
      ))}

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
    </div>
  )
}
