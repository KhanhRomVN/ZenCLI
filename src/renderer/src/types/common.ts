/**
 * Common types shared across all providers
 */

export type ProviderName = 'claude' | 'chatgpt' | 'deepseek' | 'gemini'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: Record<string, any>
}

export interface Tab {
  id: string
  name: string
  provider: ProviderName
  messages: Message[]
  conversationId?: string
  parentMessageUuid?: string
  model?: string
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  provider: 'google' | 'github' | 'email'
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  defaultProvider?: ProviderName
  language: string
}
