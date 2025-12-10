import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ConversationContextType {
  // Current conversation
  conversationId: string | undefined
  parentMessageUuid: string | undefined
  messages: Message[]

  // Actions
  setConversationId: (id: string) => void
  setParentMessageUuid: (uuid: string) => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  clearMessages: () => void
  loadConversationHistory: (convId: string) => Promise<void>
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined)

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [parentMessageUuid, setParentMessageUuid] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<Message[]>([])

  const loadConversationHistory = useCallback(async (convId: string) => {
    try {
      console.log(`Loading conversation history for: ${convId}`)

      // Fetch conversation messages from API
      const result = await window.electron.ipcRenderer.invoke(
        'claude:get-conversation-messages',
        convId
      )

      if (result.success && Array.isArray(result.messages)) {
        // Set conversation ID and parent message UUID
        setConversationId(convId)
        if (result.parentMessageUuid) {
          setParentMessageUuid(result.parentMessageUuid)
        }

        // Load messages into state
        setMessages(result.messages)

        console.log(`Loaded ${result.messages.length} messages for conversation ${convId}`)
      } else {
        console.error('Failed to load conversation messages:', result.error)
        // Clear messages if loading failed
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error)
      setMessages([])
    }
  }, [])

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message])
  }, [])

  const updateLastMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const updated = [...prev]
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content
        }
      }
      return updated
    })
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setConversationId(undefined)
    setParentMessageUuid(undefined)
  }, [])

  return (
    <ConversationContext.Provider
      value={{
        conversationId,
        parentMessageUuid,
        messages,
        setConversationId,
        setParentMessageUuid,
        addMessage,
        updateLastMessage,
        clearMessages,
        loadConversationHistory
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversation() {
  const context = useContext(ConversationContext)
  if (!context) {
    throw new Error('useConversation must be used within ConversationProvider')
  }
  return context
}
