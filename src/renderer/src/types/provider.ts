// ============================================
// PROVIDER TYPES
// ============================================

export enum ProviderType {
  GOOGLE_GEMINI = 'google_gemini',
  LITELLM = 'litellm'
}

export interface BaseProviderConfig {
  id: string
  name: string
  type: ProviderType
  createdAt: string
  isActive: boolean
}

export interface GeminiProviderConfig extends BaseProviderConfig {
  type: ProviderType.GOOGLE_GEMINI
  apiKey: string
  model?: string
  temperature?: number
  topK?: number
  topP?: number
  maxOutputTokens?: number
}

export interface LiteLLMProviderConfig extends BaseProviderConfig {
  type: ProviderType.LITELLM
  baseUrl: string
  apiKey: string
  modelId: string
  temperature?: number
  topK?: number
  topP?: number
  maxOutputTokens?: number
}

export type ProviderConfig = GeminiProviderConfig | LiteLLMProviderConfig

// ============================================
// PROVIDER RESPONSE INTERFACES
// ============================================

export interface AIVocabularyDefinition {
  meaning: string
  translation: string
  usage_context?: string
  word_type?:
    | 'noun'
    | 'verb'
    | 'adjective'
    | 'adverb'
    | 'pronoun'
    | 'preposition'
    | 'conjunction'
    | 'interjection'
    | 'determiner'
    | 'exclamation'
  phrase_type?: 'idiom' | 'phrasal_verb' | 'collocation' | 'slang' | 'expression'
  examples: Array<{
    sentence: string
    translation: string
  }>
}

export interface AIVocabularyRelationship {
  relationship_type: 'synonyms' | 'antonyms' | 'word_family' | 'collocations' | 'common_phrases'
  items: string[]
}

export interface AIWordResult {
  word: string
  pronunciation: string
  difficulty_level?: number
  frequency_rank?: number
  category?: string
  tags?: string[]
  metadata?: Record<string, any>
  definitions: AIVocabularyDefinition[]
  relationships?: AIVocabularyRelationship[]
}

export interface AIPhraseResult {
  phrase: string
  pronunciation: string
  difficulty_level?: number
  frequency_rank?: number
  category?: string
  tags?: string[]
  metadata?: Record<string, any>
  definitions: AIVocabularyDefinition[]
  relationships?: AIVocabularyRelationship[]
}

export interface AIGrammarRule {
  rule_description: string
  translation: string
  formula?: string
  usage_context?: string
  notes?: string
  examples: Array<{
    sentence: string
    translation: string
    is_correct: boolean
    explanation?: string
  }>
}

export interface AIGrammarMistake {
  incorrect_example: string
  correct_example: string
  explanation: string
  translation?: string
}

export interface AIGrammarResult {
  title: string
  item_type: 'tense' | 'structure' | 'rule' | 'pattern'
  difficulty_level?: number
  frequency_rank?: number
  category?: string
  tags?: string[]
  metadata?: Record<string, any>
  rules: AIGrammarRule[]
  common_mistakes?: AIGrammarMistake[]
}

// ============================================
// PROVIDER INTERFACE
// ============================================

export interface AIProvider {
  fetchWord(word: string): Promise<AIWordResult>
  fetchPhrase(phrase: string): Promise<AIPhraseResult>
  fetchGrammar(grammarPoint: string): Promise<AIGrammarResult>
  generateQuestions(prompt: string): Promise<string>
  validate(): Promise<boolean>
}
