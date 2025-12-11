import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'
import { useConversation } from '../../providers/conversation-provider'
import { Textarea } from '@khanhromvn/zenui'
import { CornerDownRight } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface TerminalPageProps {
  messages?: Message[]
  conversationId?: string
  onMessagesUpdate?: (messages: Message[]) => void
  onModeChange?: (mode: 'gui' | 'cli') => void
}

export default function TerminalPage({
  messages: initialMessages = [],
  conversationId: initialConversationId,
  onMessagesUpdate,
  onModeChange
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
      onMessagesUpdate?.(updatedMessagesWithUser)

      term.writeln(`\x1b[1;33mYou:\x1b[0m ${input.trim()}`)
      term.writeln('')
      term.writeln('\x1b[90m[Sending...]\x1b[0m')

      setInput('')

      // Create conversation if needed
      let convId = localConversationId
      let parentUuid = localParentMessageUuid

      if (!convId) {
        const createResult = await window.electron.ipcRenderer.invoke('claude:create-conversation')
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
      onMessagesUpdate?.(updatedMessagesWithAssistant)

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
            onMessagesUpdate?.(updated)
            return updated
          })

          if (isFirstChunk) {
            // Clear the "Sending..." line
            term.write('\r\x1b[K')
            term.write('\x1b[1;36mClaude:\x1b[0m ')
            isFirstChunk = false
          } else {
            // Clear current line and rewrite
            const lastLineStart = fullResponse.lastIndexOf('\n') + 1
            const currentLineLength = fullResponse.length - lastLineStart

            // Move cursor back and clear
            for (let i = 0; i < currentLineLength; i++) {
              term.write('\b')
            }
            term.write('\x1b[K')
          }

          // Write the new text
          const lines = data.text.split('\n')
          const lastLine = lines[lines.length - 1]
          term.write(lastLine)
        }
      }

      window.electron.ipcRenderer.on('claude:stream-chunk', handleStreamChunk)

      // Send message via IPC
      await window.electron.ipcRenderer.invoke('claude:send-message', {
        conversationId: convId!,
        parentMessageUuid: parentUuid!,
        message: userMessage.content
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
        <div className="flex items-center gap-2">
          {/* Model Badge */}
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium">
            <span>🤖</span>
            <span>Claude Sonnet 4.5</span>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (onModeChange) onModeChange('gui')
                else {
                  const event = new CustomEvent('mode-change', { detail: 'gui' })
                  window.dispatchEvent(event)
                }
              }}
              className="px-2 py-1 rounded-md text-xs font-medium transition-colors bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            >
              GUI
            </button>
            <button
              onClick={() => {
                if (onModeChange) onModeChange('cli')
                else {
                  const event = new CustomEvent('mode-change', { detail: 'cli' })
                  window.dispatchEvent(event)
                }
              }}
              className="px-2 py-1 rounded-md text-xs font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              CLI
            </button>
          </div>

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
