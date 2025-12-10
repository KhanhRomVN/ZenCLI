import {
  AIProvider,
  AIVocabularyDefinition,
  AIVocabularyRelationship,
  AIWordResult,
  AIPhraseResult,
  AIGrammarResult,
  AIGrammarRule,
  AIGrammarMistake,
  LiteLLMProviderConfig
} from '../../types/provider'

import { LiteLLMWrapper } from './LiteLLMWrapper'

export class LiteLLMProvider implements AIProvider {
  private config: LiteLLMProviderConfig

  constructor(config: LiteLLMProviderConfig) {
    this.config = config
  }

  async fetchWord(word: string): Promise<AIWordResult> {
    const prompt = this.buildWordPrompt(word)
    const response = await this.makeRequest(prompt)

    return this.parseWordResponse(word, response)
  }

  async fetchPhrase(phrase: string): Promise<AIPhraseResult> {
    const prompt = this.buildPhrasePrompt(phrase)
    const response = await this.makeRequest(prompt)

    return this.parsePhraseResponse(phrase, response)
  }

  async fetchGrammar(grammarPoint: string): Promise<AIGrammarResult> {
    const prompt = this.buildGrammarPrompt(grammarPoint)
    const response = await this.makeRequest(prompt)

    return this.parseGrammarResponse(grammarPoint, response)
  }

  async generateQuestions(prompt: string): Promise<string> {
    const questionPrompt = this.buildQuestionPrompt(prompt)
    const response = await this.makeRequest(questionPrompt)

    return response
  }

  async validate(): Promise<boolean> {
    try {
      // Test connection with a simple request
      const testPrompt = 'Say "OK" if you are working properly.'
      const response = await this.makeRequest(testPrompt, 10000) // 10 second timeout for validation

      return response.toLowerCase().includes('ok')
    } catch (error) {
      console.error('LiteLLM provider validation failed:', error)
      return false
    }
  }

  private async makeRequest(prompt: string, timeoutMs: number = 30000): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.modelId,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxOutputTokens || 2000
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private buildWordPrompt(word: string): string {
    const originalPrompt = `Analyze the word "${word}" and provide detailed information in JSON format with the following structure:

{
 "word": "${word}",
 "pronunciation": "phonetic pronunciation",
 "difficulty_level": 1-10,
 "frequency_rank": 1-10000,
 "category": "general category",
 "tags": ["tag1", "tag2"],
 "definitions": [
 {
 "meaning": "primary meaning",
 "translation": "translation in target language",
 "usage_context": "context where used",
 "word_type": "noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|determiner|exclamation",
 "phrase_type": "idiom|phrasal_verb|collocation|slang|expression",
 "examples": [
 {
 "sentence": "example sentence",
 "translation": "translated example"
 }
 ]
 }
 ],
 "relationships": [
 {
 "relationship_type": "synonyms|antonyms|word_family|collocations|common_phrases",
 "items": ["related_word1", "related_word2"]
 }
 ]
}

Please provide accurate and comprehensive information.`

    return LiteLLMWrapper.wrapVocabularyPrompt(originalPrompt)
  }

  private buildPhrasePrompt(phrase: string): string {
    const originalPrompt = `Analyze the phrase "${phrase}" and provide detailed information in JSON format with the following structure:

{
 "phrase": "${phrase}",
 "pronunciation": "phonetic pronunciation",
 "difficulty_level": 1-10,
 "frequency_rank": 1-10000,
 "category": "general category",
 "tags": ["tag1", "tag2"],
 "definitions": [
 {
 "meaning": "primary meaning",
 "translation": "translation in target language",
 "usage_context": "context where used",
 "word_type": "noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|determiner|exclamation",
 "phrase_type": "idiom|phrasal_verb|collocation|slang|expression",
 "examples": [
 {
 "sentence": "example sentence",
 "translation": "translated example"
 }
 ]
 }
 ],
 "relationships": [
 {
 "relationship_type": "synonyms|antonyms|word_family|collocations|common_phrases",
 "items": ["related_phrase1", "related_phrase2"]
 }
 ]
}

Please provide accurate and comprehensive information.`

    return LiteLLMWrapper.wrapPhrasePrompt(originalPrompt)
  }

  private buildGrammarPrompt(grammarPoint: string): string {
    const originalPrompt = `Explain the grammar point "${grammarPoint}" and provide detailed information in JSON format with the following structure:

{
 "title": "${grammarPoint}",
 "item_type": "tense|structure|rule|pattern",
 "difficulty_level": 1-10,
 "frequency_rank": 1-10000,
 "category": "grammar category",
 "tags": ["tag1", "tag2"],
 "rules": [
 {
 "rule_description": "description of the rule",
 "translation": "translation in target language",
 "formula": "grammar formula if applicable",
 "usage_context": "context where used",
 "notes": "additional notes",
 "examples": [
 {
 "sentence": "example sentence",
 "translation": "translated example",
 "is_correct": true,
 "explanation": "explanation of the example"
 }
 ]
 }
 ],
 "common_mistakes": [
 {
 "incorrect_example": "incorrect usage example",
 "correct_example": "corrected version",
 "explanation": "explanation of the mistake",
 "translation": "translation of examples"
 }
 ]
}

Please provide accurate and comprehensive information.`

    return LiteLLMWrapper.wrapGrammarPrompt(originalPrompt)
  }

  private buildQuestionPrompt(prompt: string): string {
    const originalPrompt = `Generate practice questions based on the following topic: "${prompt}"

Please provide questions that test understanding and application. Format the response in a clear, readable way.`

    return LiteLLMWrapper.wrapSessionPrompt(originalPrompt)
  }

  private parseWordResponse(word: string, response: string): AIWordResult {
    try {
      const data = JSON.parse(response)

      return {
        word: data.word || word,
        pronunciation: data.pronunciation || '',
        difficulty_level: data.difficulty_level,
        frequency_rank: data.frequency_rank,
        category: data.category,
        tags: data.tags || [],
        metadata: data.metadata || {},
        definitions: data.definitions || [],
        relationships: data.relationships || []
      }
    } catch (error) {
      // Fallback parsing if JSON parsing fails
      return {
        word,
        pronunciation: '',
        definitions: [
          {
            meaning: response.substring(0, 200),
            translation: '',
            examples: []
          }
        ],
        relationships: []
      }
    }
  }

  private parsePhraseResponse(phrase: string, response: string): AIPhraseResult {
    try {
      const data = JSON.parse(response)

      return {
        phrase: data.phrase || phrase,
        pronunciation: data.pronunciation || '',
        difficulty_level: data.difficulty_level,
        frequency_rank: data.frequency_rank,
        category: data.category,
        tags: data.tags || [],
        metadata: data.metadata || {},
        definitions: data.definitions || [],
        relationships: data.relationships || []
      }
    } catch (error) {
      // Fallback parsing if JSON parsing fails
      return {
        phrase,
        pronunciation: '',
        definitions: [
          {
            meaning: response.substring(0, 200),
            translation: '',
            examples: []
          }
        ],
        relationships: []
      }
    }
  }

  private parseGrammarResponse(grammarPoint: string, response: string): AIGrammarResult {
    try {
      const data = JSON.parse(response)

      return {
        title: data.title || grammarPoint,
        item_type: data.item_type || 'rule',
        difficulty_level: data.difficulty_level,
        frequency_rank: data.frequency_rank,
        category: data.category,
        tags: data.tags || [],
        metadata: data.metadata || {},
        rules: data.rules || [],
        common_mistakes: data.common_mistakes || []
      }
    } catch (error) {
      // Fallback parsing if JSON parsing fails
      return {
        title: grammarPoint,
        item_type: 'rule',
        rules: [
          {
            rule_description: response.substring(0, 200),
            translation: '',
            examples: []
          }
        ],
        common_mistakes: []
      }
    }
  }
}
