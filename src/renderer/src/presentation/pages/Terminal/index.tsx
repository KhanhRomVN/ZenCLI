import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'
import { useConversation } from '../../providers/conversation-provider'
import { Textarea } from '@khanhromvn/zenui'
import { CornerDownRight } from 'lucide-react'

export default function TerminalPage() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const {
    conversationId,
    parentMessageUuid,
    messages,
    setConversationId,
    setParentMessageUuid,
    addMessage,
    updateLastMessage
  } = useConversation()

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
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Welcome message
    term.writeln('\x1b[1;32m╔═══════════════════════════════════════════╗\x1b[0m')
    term.writeln('\x1b[1;32m║         Welcome to ZenCLI Terminal        ║\x1b[0m')
    term.writeln('\x1b[1;32m╚═══════════════════════════════════════════╝\x1b[0m')
    term.writeln('')

    // Display existing conversation history
    if (messages.length > 0) {
      term.writeln('\x1b[90m[Conversation history loaded]\x1b[0m')
      term.writeln('')
      messages.forEach((msg) => {
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

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const term = xtermRef.current
    if (!term) return

    setIsStreaming(true)

    try {
      // Add user message to conversation
      const userMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: input.trim(),
        timestamp: Date.now()
      }
      addMessage(userMessage)

      term.writeln(`\x1b[1;33mYou:\x1b[0m ${input.trim()}`)
      term.writeln('')
      term.writeln('\x1b[90m[Sending...]\x1b[0m')

      setInput('')

      // Create conversation if needed
      let convId = conversationId
      let parentUuid = parentMessageUuid

      if (!convId) {
        const createResult = await window.electron.ipcRenderer.invoke('claude:create-conversation')
        convId = createResult.conversationId
        parentUuid = createResult.parentMessageUuid
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
      addMessage(assistantMessage)

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
          updateLastMessage(fullResponse)

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
      <div className="border-t border-gray-700 bg-[#252526] p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Badges Row */}
          <div className="flex items-center gap-2">
            {/* Model Badge */}
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-300 rounded-md text-xs font-medium">
              <span>🤖</span>
              <span>Claude Sonnet 4.5</span>
            </div>

            <div className="flex-1" />

            {/* Mode Toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const event = new CustomEvent('mode-change', { detail: 'gui' })
                  window.dispatchEvent(event)
                }}
                className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md text-xs font-medium hover:bg-gray-600 transition-colors"
              >
                GUI
              </button>
              <button
                onClick={() => {
                  const event = new CustomEvent('mode-change', { detail: 'cli' })
                  window.dispatchEvent(event)
                }}
                className="px-2 py-1 bg-green-900/30 text-green-300 rounded-md text-xs font-medium hover:bg-green-900/50 transition-colors"
              >
                CLI
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div className="w-full">
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
                    className="flex items-center gap-2 px-3 py-1.5 bg-button-bg hover:bg-button-bgHover text-button-bgText border border-button-border hover:border-button-borderHover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send message (Enter)"
                  >
                    <CornerDownRight size={14} />
                    <span className="text-sm">Send</span>
                  </button>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
