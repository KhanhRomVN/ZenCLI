import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'
import { useConversation } from '../../../providers/conversation-provider'
import {
  Textarea,
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem
} from '@khanhromvn/zenui'
import { CornerDownRight, Plus, Folder, FolderOpen, ChevronDown } from 'lucide-react'
import { combinePrompts } from '../../../../constants/prompts'
import { filterRelevantFiles } from '../../../../utils/file-filter'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface TerminalPageProps {
  messages?: Message[]
  conversationId?: string
  selectedFolder?: string
  selectedModel?: string
  availableModels?: Array<{ id: string; name: string }>
  onMessagesUpdate?: (messages: Message[]) => void
  onAddAccount?: () => void
  onSelectFolder?: () => void
  onSelectModel?: (modelId: string) => void
}

export default function TerminalPage({
  messages: initialMessages = [],
  conversationId: initialConversationId,
  selectedFolder,
  selectedModel,
  availableModels = [],
  onMessagesUpdate,
  onAddAccount,
  onSelectFolder,
  onSelectModel
}: TerminalPageProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Use local state for messages, initialized from props
  const [localMessages, setLocalMessages] = useState<Message[]>(initialMessages)
  const [localConversationId, setLocalConversationId] = useState<string | undefined>(
    initialConversationId
  )
  const [localParentMessageUuid, setLocalParentMessageUuid] = useState<string | undefined>()
  const [isFirstMessage, setIsFirstMessage] = useState(true) // Track if this is first message

  const { setConversationId, setParentMessageUuid } = useConversation()

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: false,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      allowProposedApi: true,
      disableStdin: true // Make terminal read-only
    })

    // Custom key handler for Copy (Ctrl+C / Cmd+C)
    term.attachCustomKeyEventHandler((event) => {
      // Check for Ctrl+C or Cmd+C (on Mac)
      const isCopy = (event.ctrlKey || event.metaKey) && event.key === 'c'

      if (isCopy && term.hasSelection()) {
        const selection = term.getSelection()
        navigator.clipboard.writeText(selection)
        return false // Do not propagate to terminal (prevent SIGINT if it wasn't read-only)
      }
      return true
    })

    // Add addons
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    // Open terminal
    term.open(terminalRef.current)

    // Safely fit the terminal
    const safeFit = () => {
      try {
        if (
          terminalRef.current &&
          terminalRef.current.offsetParent !== null &&
          terminalRef.current.clientWidth > 0 &&
          terminalRef.current.clientHeight > 0
        ) {
          fitAddon.fit()
        }
      } catch (e) {
        console.error('Failed to fit terminal:', e)
      }
    }

    // Initial fit with delay
    setTimeout(safeFit, 100)

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Welcome message
    term.writeln('\x1b[1;32m╔═══════════════════════════════════════════╗\x1b[0m')
    term.writeln('\x1b[1;32m║         Welcome to ZenCLI Terminal        ║\x1b[0m')
    term.writeln('\x1b[1;32m╚═══════════════════════════════════════════╝\x1b[0m')
    term.writeln('')

    // Display existing conversation history
    if (initialMessages.length > 0) {
      term.writeln('\x1b[90m[Conversation history loaded]\x1b[0m')
      term.writeln('')
      initialMessages.forEach((msg: Message) => {
        if (msg.role === 'user') {
          term.writeln(`\x1b[1;33mYou:\x1b[0m ${msg.content}`)
        } else {
          term.writeln(`\x1b[1;36mClaude:\x1b[0m ${msg.content}`)
        }
        term.writeln('')
      })
    } else {
      term.writeln('Type your message in the textarea below and press Enter to chat.')
      term.writeln('')
    }

    // Use ResizeObserver for more robust resizing support (handles split view resizing)
    const resizeObserver = new ResizeObserver(() => {
      safeFit()
    })

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      term.dispose()
    }
  }, [])

  // Sync with messages prop changes (e.g., when "New Chat" is clicked)
  useEffect(() => {
    const term = xtermRef.current
    if (!term) return

    // If messages were cleared (New Chat), reset the terminal
    if (initialMessages.length === 0 && localMessages.length > 0) {
      // Clear terminal
      term.clear()

      // Reset local state
      setLocalMessages([])
      setLocalConversationId(undefined)
      setLocalParentMessageUuid(undefined)
      setIsFirstMessage(true) // Reset for new conversation

      // Redisplay welcome message
      term.writeln('\x1b[1;32m╔═══════════════════════════════════════════╗\x1b[0m')
      term.writeln('\x1b[1;32m║         Welcome to ZenCLI Terminal        ║\x1b[0m')
      term.writeln('\x1b[1;32m╚═══════════════════════════════════════════╝\x1b[0m')
      term.writeln('')
      term.writeln('Type your message in the textarea below and press Enter to chat.')
      term.writeln('')
    }
  }, [initialMessages])

  // Sync initialMessages prop into localMessages when switching modes
  // This ensures messages are preserved when switching between CLI and GUI
  useEffect(() => {
    // CRITICAL: Only sync if parent has MORE or EQUAL messages
    // Never sync if parent sends LESS messages (would delete local messages)
    // Exception: If parent sends empty AND local is also empty (initial state)
    const shouldSync =
      initialMessages.length > localMessages.length || // Parent has new messages
      (initialMessages.length === 0 && localMessages.length === 0) // Both empty (initial)

    if (shouldSync && initialMessages.length !== localMessages.length) {
      setLocalMessages(initialMessages)
    } else if (initialMessages.length < localMessages.length) {
    }
  }, [initialMessages])

  // Sync local messages with parent component (after render completes)
  // Use a ref to track if we should notify parent to avoid infinite loops
  const prevMessagesLengthRef = useRef(0)
  useEffect(() => {
    // Only notify parent if messages actually changed (not just re-render)
    if (localMessages.length !== prevMessagesLengthRef.current) {
      prevMessagesLengthRef.current = localMessages.length
      onMessagesUpdate?.(localMessages)
    }
  }, [localMessages, onMessagesUpdate])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const term = xtermRef.current
    if (!term) return

    setIsStreaming(true)

    try {
      // Add user message to local state
      const userMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: input.trim(),
        timestamp: Date.now()
      }

      const updatedMessagesWithUser = [...localMessages, userMessage]
      setLocalMessages(updatedMessagesWithUser)

      term.writeln(`\x1b[1;33mYou:\x1b[0m ${input.trim()}`)
      term.writeln('')
      term.writeln('\x1b[90m[Sending...]\x1b[0m')

      setInput('')

      // Create conversation if needed
      let convId = localConversationId
      let parentUuid = localParentMessageUuid

      if (!convId) {
        const createResult = await window.electron.ipcRenderer.invoke(
          'claude:create-conversation',
          selectedModel
        )
        convId = createResult.conversationId
        parentUuid = createResult.parentMessageUuid
        setLocalConversationId(convId!)
        setLocalParentMessageUuid(parentUuid!)
        setConversationId(convId!)
        setParentMessageUuid(parentUuid!)
      }

      // Add assistant message placeholder
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: '',
        timestamp: Date.now()
      }

      const updatedMessagesWithAssistant = [...updatedMessagesWithUser, assistantMessage]
      setLocalMessages(updatedMessagesWithAssistant)

      // Listen for streaming response
      let fullResponse = ''
      let isFirstChunk = true
      const handleStreamChunk = (_event: any, data: { text: string; complete?: boolean }) => {
        if (data.complete) {
          term.writeln('')
          term.writeln('')
          window.electron.ipcRenderer.removeListener('claude:stream-chunk', handleStreamChunk)
          setIsStreaming(false)
        } else {
          // Calculate delta to append only new text
          const newText = data.text.slice(fullResponse.length)
          fullResponse = data.text

          // Update last message in local state
          setLocalMessages((prev) => {
            const updated = [...prev]
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: fullResponse
              }
            }
            return updated
          })

          if (isFirstChunk) {
            // Clear the "Sending..." line
            term.write('\r\x1b[K')
            term.write('\x1b[1;36mClaude:\x1b[0m ')
            isFirstChunk = false
          }

          // Write the new text with proper newline conversion for xterm.js
          term.write(newText.replace(/\n/g, '\r\n'))
        }
      }

      window.electron.ipcRenderer.on('claude:stream-chunk', handleStreamChunk)

      // Build enhanced prompt with context
      const userMessageContent = userMessage.content
      let enhancedPrompt = userMessageContent

      // Add file context if folder is selected
      if (selectedFolder) {
        try {
          const fileListResult = await window.electron.ipcRenderer.invoke(
            'fs:list-files',
            selectedFolder
          )

          if (fileListResult.success && fileListResult.files.length > 0) {
            // Filter files based on relevance to user message
            const relevantFiles = filterRelevantFiles(fileListResult.files, userMessageContent)
            const fileContext = `\n\n<project_context>\nProject folder: ${selectedFolder}\nRelevant files (${relevantFiles.length} of ${fileListResult.totalFiles} total):\n${relevantFiles.join('\n')}\n</project_context>`
            enhancedPrompt = userMessageContent + fileContext
          }
        } catch (error) {
          console.error('[CLI] Failed to get file list:', error)
        }
      }

      // Add DEFAULT_CLI_PROMPT for first message only
      let finalPrompt = enhancedPrompt
      if (isFirstMessage) {
        const systemPrompt = combinePrompts()
        finalPrompt = `${systemPrompt}\n\n${enhancedPrompt}`
        setIsFirstMessage(false)
      }

      // Send message via IPC
      await window.electron.ipcRenderer.invoke('claude:send-message', {
        conversationId: convId!,
        parentMessageUuid: parentUuid!,
        message: finalPrompt
      })
    } catch (error) {
      term.writeln('')
      term.writeln(`\x1b[1;31mError: ${error}\x1b[0m`)
      term.writeln('')
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Terminal Display Area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div ref={terminalRef} className="h-full" />
      </div>

      {/* Input Area */}
      <div className="w-full p-2 space-y-3 border-t border-border-default bg-card-background">
        {/* Badges Row */}
        {/* Badges Row - Now with Controls */}
        <div className="flex items-center gap-2 mb-2">
          {/* Add Account Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              console.log('Clicked Add Account')
              onAddAccount?.()
            }}
            className="p-1 hover:bg-gray-700 rounded text-text-secondary hover:text-text-primary transition-colors"
            title="Add Account"
          >
            <Plus size={16} />
          </button>

          <div className="w-px h-4 bg-border-default mx-1" />

          {/* Folder Selector */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelectFolder?.()
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              selectedFolder
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                : 'bg-zinc-800 hover:bg-zinc-700 text-text-secondary'
            }`}
            title={selectedFolder || 'No folder selected'}
          >
            {selectedFolder ? <FolderOpen size={12} /> : <Folder size={12} />}
            <span className="max-w-[150px] truncate">
              {selectedFolder ? selectedFolder.split('/').pop() || selectedFolder : 'Select Folder'}
            </span>
          </button>

          {/* Model Selector */}
          <Dropdown>
            <DropdownTrigger>
              <button className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-medium text-text-secondary transition-colors">
                <span>🤖</span>
                <span>
                  {availableModels?.find((m) => m.id === selectedModel)?.name ||
                    'Claude Sonnet 4.5'}
                </span>
                <ChevronDown size={12} />
              </button>
            </DropdownTrigger>
            <DropdownContent className="bg-dropdown-background border border-dropdown-border">
              {availableModels?.map((model) => (
                <DropdownItem
                  key={model.id}
                  onClick={() => onSelectModel?.(model.id)}
                  className={`hover:bg-dropdown-itemHover ${
                    selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {model.name}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
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
          placeholder={selectedFolder ? 'Message Claude...' : 'Please select a folder to start'}
          className="!w-full border border-input-border-default bg-input-background hover:border-input-border-hover rounded-md"
          style={{ width: '100%' }}
          minRows={2}
          maxRows={10}
          disabled={isStreaming || !selectedFolder}
          resize="none"
          bottomWrapper={
            <div className="flex items-center justify-end">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming || !selectedFolder}
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
