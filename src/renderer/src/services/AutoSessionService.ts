import { Session } from '../presentation/pages/Session/types'
import { Question } from '../presentation/pages/Session/types'
import { createCreateCollectionService } from '../presentation/pages/Collection/services/CreateCollectionService'

export interface AutoSessionConfig {
  enabled: boolean
  interval_minutes: number
  max_pending_sessions: number
  session_expiry_hours: number
  question_count: number
  difficulty_range?: [number, number]
}

export class AutoSessionService {
  private intervalId: NodeJS.Timeout | null = null
  private onSessionCreated?: (session: Session) => void
  private readonly intervalMinutes: number
  private readonly maxPendingSessions: number
  private readonly sessionExpiryHours: number
  private readonly questionCount: number
  private readonly difficultyRange?: [number, number]

  constructor(config: AutoSessionConfig, onSessionCreated?: (session: Session) => void) {
    this.intervalMinutes = config.interval_minutes
    this.maxPendingSessions = config.max_pending_sessions
    this.sessionExpiryHours = config.session_expiry_hours
    this.questionCount = config.question_count
    this.difficultyRange = config.difficulty_range
    this.onSessionCreated = onSessionCreated
  }

  start() {
    const intervalMs = this.intervalMinutes * 60 * 1000

    // Tạo session ngay lập tức lần đầu (optional)
    this.createAutoSession()

    this.intervalId = setInterval(async () => {
      await this.createAutoSession()
    }, intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async createAutoSession() {
    const startTime = Date.now()

    try {
      // 1. Lấy vocabulary và grammar items từ database
      const { getSessionService } = await import('./SessionService')
      const sessionService = getSessionService()

      const { vocabularyIds, grammarIds } = await sessionService.selectSmartItems(
        this.questionCount
      )

      // 2. Generate questions từ AI
      const questions = await this.generateQuestionsWithAI(vocabularyIds, grammarIds)

      if (questions.length === 0) {
        console.warn('[AutoSessionService] ⚠️ No questions generated')
        return
      }

      // 3. Lưu session vào cloud database
      const session = await sessionService.createSession(questions, this.sessionExpiryHours)

      // Hiển thị popup window nếu behavior là 'surprise'
      if (!window.api) {
        console.warn('[AutoSessionService] ⚠️ window.api not available')
      } else {
        const configStr = await window.api.storage.get('auto_session_config')
        const config = configStr || {}

        if (config.popup_behavior === 'surprise') {
          await window.api.popup.showSession(session)
        }
      }

      this.onSessionCreated?.(session)
    } catch (error) {
      console.error('[AutoSessionService] Error creating auto session:', error)
    }
  }

  private async getNativeLanguage(): Promise<string> {
    try {
      const res = await (window as any).api?.cloudDatabase?.getNativeLanguage()
      if (res?.success && res.nativeLanguage) return res.nativeLanguage
    } catch (e) {
      console.warn('[AutoSessionService] getNativeLanguage fallback to vi:', e)
    }
    return 'vi'
  }

  private async generateQuestionsWithAI(
    vocabularyIds: string[],
    grammarIds: string[]
  ): Promise<Question[]> {
    try {
      if (!window.api) {
        console.error('[AutoSessionService] ❌ window.api not available')
        return []
      }

      const apiKeysStr = await window.api.storage.get('gemini_api_keys')
      if (!apiKeysStr) {
        console.warn('[AutoSessionService] ⚠️ No Gemini API keys found')
        return []
      }

      let apiKeys: any
      if (typeof apiKeysStr === 'string') {
        apiKeys = JSON.parse(apiKeysStr)
      } else {
        apiKeys = apiKeysStr
      }

      if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
        console.warn('[AutoSessionService] ⚠️ No valid API keys available')
        return []
      }

      const selectedKey = apiKeys[0]

      const service = createCreateCollectionService(selectedKey.key)
      const nativeLanguage = await this.getNativeLanguage()
      const prompt = this.buildQuestionsPrompt(nativeLanguage)

      const textResponse = await service.generateQuestions(prompt)

      // Parse JSON từ response
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/)
      const jsonText = jsonMatch ? jsonMatch[1] : textResponse

      const parsed = JSON.parse(jsonText)

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        console.warn('[AutoSessionService] ⚠️ Invalid questions format from AI:', parsed)
        return []
      }

      const questions: Question[] = parsed.questions.map((q: any, index: number) => {
        // Tính scores dựa trên difficulty_level
        const baseScore = q.difficulty_level * 10
        const scores: [number, number, number, number, number, number] = [
          baseScore + 20, // Rất nhanh (<30% time_limit)
          baseScore + 15, // Nhanh (<50% time_limit)
          baseScore + 10, // Trung bình (<70% time_limit)
          baseScore + 5, // Hơi chậm (<85% time_limit)
          baseScore, // Chậm (<100% time_limit)
          Math.floor(baseScore * 0.5) // Quá thời gian (>100% time_limit)
        ]

        // Tính time_limit dựa trên difficulty_level và question_type
        const baseTime = 30 // 30 seconds
        const typeMultiplier = [
          'translate',
          'grammar_transformation',
          'reverse_translation'
        ].includes(q.question_type)
          ? 2
          : 1
        const timeLimit = baseTime + q.difficulty_level * 5 * typeMultiplier

        const question: Question = {
          ...q,
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`,
          created_at: new Date().toISOString(),
          difficulty_level: q.difficulty_level || 5,
          vocabulary_item_ids: vocabularyIds.length > 0 ? vocabularyIds.slice(0, 2) : [],
          grammar_points: grammarIds.length > 0 ? grammarIds.slice(0, 2) : [],
          scores: scores,
          time_limit: timeLimit
        }

        return question
      })

      return questions
    } catch (error) {
      console.error('[AutoSessionService] ❌ Error generating questions:', error)
      if (error instanceof Error) {
        console.error('[AutoSessionService] ❌ Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
      return []
    }
  }

  private buildQuestionsPrompt(nativeLanguage: string): string {
    return `Generate ${this.questionCount} diverse English learning questions with random topics and question types for a learner whose native language is "${nativeLanguage}".

GENERAL RULES:
- Difficulty range: ${this.difficultyRange ? `${this.difficultyRange[0]}-${this.difficultyRange[1]}/10` : '3-7/10 (mixed)'}
- Mix question types: lexical_fix, grammar_transformation, translate, gap_fill, choice_one, choice_multi
- Topics: daily life, work, travel, education, technology, health, culture, etc.
- Each question MUST be unique, pedagogically meaningful, and adapted for ${nativeLanguage} learners.
- Explanations/hints SHOULD be in ${nativeLanguage}. If nativeLanguage='en', keep them in simplified English.

QUESTION TYPE SCHEMAS:

1. lexical_fix:
   incorrect_sentence, incorrect_word, correct_word, correct_sentence,
   error_type: 'wrong_word' | 'wrong_form' | 'wrong_collocation' | 'confused_word'
   hint (in ${nativeLanguage}), explanation (in ${nativeLanguage}), difficulty_level

2. grammar_transformation:
   original_sentence, transformation_instruction, correct_answer,
   grammar_focus: 'passive' | 'tense_change' | 'conditional' | 'reported_speech'
   alternative_answers (array), hint (in ${nativeLanguage}), explanation (in ${nativeLanguage}), difficulty_level

3. translate:
   source_sentence (in ${nativeLanguage}), source_language: '${nativeLanguage}',
   correct_translation (English), alternative_translations (array of English),
   hint (in ${nativeLanguage}), key_vocabulary (array of { word: string, meaning: string in ${nativeLanguage} }), difficulty_level

4. gap_fill:
   sentence_with_gaps (English, use ____ for gaps),
   gaps: [{ position: number, correct_answer: string, alternative_answers: string[] }],
   word_bank (optional array), hint (in ${nativeLanguage}), difficulty_level

5. choice_one:
   question_text (English),
   options: [{ id: string, text: string }],
   correct_option_id, hint (in ${nativeLanguage}), explanation (in ${nativeLanguage}), difficulty_level

6. choice_multi:
   question_text (English),
   options: [{ id: string, text: string }],
   correct_option_ids (array), hint (in ${nativeLanguage}), explanation (in ${nativeLanguage}), difficulty_level

OUTPUT STRICT JSON:
\`\`\`json
{
  "questions": [
    {
      "question_type": "lexical_fix",
      "incorrect_sentence": "I am very interesting in learning English.",
      "incorrect_word": "interesting",
      "correct_word": "interested",
      "correct_sentence": "I am very interested in learning English.",
      "error_type": "wrong_form",
      "hint": "Phân biệt '-ing' và '-ed' trong tính từ mô tả cảm xúc.",
      "explanation": "'Interested' diễn tả cảm xúc của người học; 'interesting' mô tả sự vật gây hứng thú.",
      "difficulty_level": 3
    },
    {
      "question_type": "translate",
      "source_sentence": "${nativeLanguage === 'vi' ? 'Tôi thường đi bộ đến trường mỗi ngày.' : nativeLanguage === 'en' ? 'I usually walk to school every day.' : 'Viết một câu ngắn phổ biến diễn tả thói quen buổi sáng bằng ' + nativeLanguage}",
      "source_language": "${nativeLanguage}",
      "correct_translation": "I usually walk to school every day.",
      "alternative_translations": ["I walk to school every day.", "I often walk to school daily."],
      "hint": "Dùng thì hiện tại đơn cho thói quen.",
      "key_vocabulary": [
        { "word": "usually", "meaning": "thường xuyên" },
        { "word": "walk", "meaning": "đi bộ" }
      ],
      "difficulty_level": 4
    }
  ]
}
\`\`\`

Return ONLY valid JSON. Do NOT add explanatory text outside JSON.`
  }
}

let autoSessionServiceInstance: AutoSessionService | null = null

export const getAutoSessionService = (
  config: AutoSessionConfig,
  onSessionCreated?: (session: Session) => void
): AutoSessionService => {
  if (!autoSessionServiceInstance) {
    autoSessionServiceInstance = new AutoSessionService(config, onSessionCreated)
  }
  return autoSessionServiceInstance
}

export const destroyAutoSessionService = () => {
  if (autoSessionServiceInstance) {
    autoSessionServiceInstance.stop()
    autoSessionServiceInstance = null
  }
}
