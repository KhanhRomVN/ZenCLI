import { getCloudDatabase } from './CloudDatabaseService'
import { Session } from '../presentation/pages/Session/types'
import { Question } from '../presentation/pages/Session/types'

export class SessionService {
  /**
   * Thuật toán lựa chọn thông minh vocabulary/grammar items với AI-driven optimization
   * Kết hợp spaced repetition, adaptive difficulty, và personalized learning
   */
  async selectSmartItems(count: number = 10): Promise<{
    vocabularyIds: string[]
    grammarIds: string[]
  }> {
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not connected')

    if (!window.api) throw new Error('Electron API not available')

    // Tính toán tỷ lệ vocab/grammar thông minh dựa trên performance
    const optimalRatio = await this.calculateOptimalVocabGrammarRatio()
    const vocabCount = Math.ceil(count * optimalRatio.vocabRatio)
    const grammarCount = count - vocabCount

    // Lấy vocabulary items với thuật toán đa tiêu chí
    const vocabResult = await window.api.cloudDatabase.query(
      `
 SELECT 
 v.id,
 COALESCE(va.mastery_score, 0) as mastery,
 COALESCE(va.retention_score, 0.5) as retention,
 COALESCE(va.confidence_level, 0) as confidence,
 COALESCE(va.exposure_count, 0) as exposure,
 COALESCE(va.success_count, 0) as success_count,
 COALESCE(va.failure_count, 0) as failure_count,
 EXTRACT(EPOCH FROM (NOW() - COALESCE(va.last_reviewed, v.created_at))) as seconds_since_review,
 CASE 
 WHEN va.next_review_date IS NULL OR va.next_review_date <= NOW() THEN 1
 ELSE 0 
 END as is_due_for_review,
 v.difficulty_level,
 v.frequency_rank
 FROM vocabulary_items v
 LEFT JOIN vocabulary_analytics va ON v.id = va.vocabulary_item_id
 WHERE v.difficulty_level BETWEEN $1 AND $2
 ORDER BY 
 -- Priority 1: Items due for review (spaced repetition)
 is_due_for_review DESC,
 -- Priority 2: Smart scoring combining multiple factors
 (
 (1 - COALESCE(va.mastery_score, 0)) * 0.4 + -- Low mastery (40%)
 (1 - COALESCE(va.retention_score, 0.5)) * 0.3 + -- Low retention (30%)
 (1 - (COALESCE(va.confidence_level, 0) / 100)) * 0.2 + -- Low confidence (20%)
 (1 / (1 + COALESCE(va.exposure_count, 0))) * 0.1 -- Less exposed items (10%)
 ) DESC,
 -- Priority 3: Time since last review (fresher items first)
 seconds_since_review DESC,
 -- Priority 4: Difficulty progression
 v.difficulty_level ASC
 LIMIT $3
 `,
      [this.getOptimalDifficultyRange().min, this.getOptimalDifficultyRange().max, vocabCount]
    )

    // Lấy grammar items với thuật toán tương tự
    const grammarResult = await window.api.cloudDatabase.query(
      `
 SELECT 
 g.id,
 COALESCE(ga.mastery_score, 0) as mastery,
 COALESCE(ga.retention_score, 0.5) as retention,
 COALESCE(ga.confidence_level, 0) as confidence,
 COALESCE(ga.exposure_count, 0) as exposure,
 COALESCE(ga.success_count, 0) as success_count,
 COALESCE(ga.failure_count, 0) as failure_count,
 EXTRACT(EPOCH FROM (NOW() - COALESCE(ga.last_reviewed, g.created_at))) as seconds_since_review,
 CASE 
 WHEN ga.next_review_date IS NULL OR ga.next_review_date <= NOW() THEN 1
 ELSE 0 
 END as is_due_for_review,
 g.difficulty_level,
 g.frequency_rank
 FROM grammar_items g
 LEFT JOIN grammar_analytics ga ON g.id = ga.grammar_item_id
 WHERE g.difficulty_level BETWEEN $1 AND $2
 ORDER BY 
 -- Priority 1: Items due for review
 is_due_for_review DESC,
 -- Priority 2: Smart scoring for grammar
 (
 (1 - COALESCE(ga.mastery_score, 0)) * 0.35 + -- Low mastery (35%)
 (1 - COALESCE(ga.retention_score, 0.5)) * 0.25 + -- Low retention (25%)
 (1 - (COALESCE(ga.confidence_level, 0) / 100)) * 0.25 + -- Low confidence (25%)
 (1 / (1 + COALESCE(ga.exposure_count, 0))) * 0.15 -- Less exposed items (15%)
 ) DESC,
 -- Priority 3: Time since last review
 seconds_since_review DESC,
 -- Priority 4: Grammar complexity progression
 g.difficulty_level ASC
 LIMIT $3
 `,
      [this.getOptimalDifficultyRange().min, this.getOptimalDifficultyRange().max, grammarCount]
    )

    return {
      vocabularyIds: vocabResult.rows.map((r) => r.id),
      grammarIds: grammarResult.rows.map((r) => r.id)
    }
  }

  /**
   * Tính toán tỷ lệ vocab/grammar tối ưu dựa trên performance history
   */
  private async calculateOptimalVocabGrammarRatio(): Promise<{
    vocabRatio: number
    grammarRatio: number
  }> {
    if (!window.api) throw new Error('Electron API not available')

    try {
      // Lấy performance history từ sessions gần đây
      const recentSessions = await window.api.cloudDatabase.query(
        `
 SELECT topics, accuracy_rate, total_score
 FROM sessions 
 WHERE completed_at IS NOT NULL 
 AND created_at >= NOW() - INTERVAL '30 days'
 ORDER BY created_at DESC
 LIMIT 20
 `
      )

      if (!recentSessions.success || recentSessions.rows.length === 0) {
        // Default ratio nếu không có data
        return { vocabRatio: 0.6, grammarRatio: 0.4 }
      }

      let vocabPerformance = 0
      let grammarPerformance = 0
      let vocabCount = 0
      let grammarCount = 0

      // Phân tích performance theo topic
      for (const session of recentSessions.rows) {
        const topics = Array.isArray(session.topics) ? session.topics : []
        const accuracy = session.accuracy_rate || 0

        if (topics.includes('vocabulary')) {
          vocabPerformance += accuracy
          vocabCount++
        }
        if (topics.includes('grammar')) {
          grammarPerformance += accuracy
          grammarCount++
        }
      }

      const avgVocabPerf = vocabCount > 0 ? vocabPerformance / vocabCount : 0.5
      const avgGrammarPerf = grammarCount > 0 ? grammarPerformance / grammarCount : 0.5

      // Adaptive ratio: tập trung vào điểm yếu
      const totalPerf = avgVocabPerf + avgGrammarPerf
      if (totalPerf === 0) return { vocabRatio: 0.6, grammarRatio: 0.4 }

      // Tỷ lệ nghịch với performance (điểm yếu được tập trung nhiều hơn)
      const vocabRatio = (1 - avgVocabPerf) / 2
      const grammarRatio = (1 - avgGrammarPerf) / 2

      // Normalize và đảm bảo tổng bằng 1
      const total = vocabRatio + grammarRatio
      const normalizedVocabRatio = vocabRatio / total
      const normalizedGrammarRatio = grammarRatio / total

      // Giới hạn tỷ lệ trong khoảng hợp lý (30% - 70%)
      const constrainedVocabRatio = Math.max(0.3, Math.min(0.7, normalizedVocabRatio))
      const constrainedGrammarRatio = 1 - constrainedVocabRatio

      return {
        vocabRatio: constrainedVocabRatio,
        grammarRatio: constrainedGrammarRatio
      }
    } catch (error) {
      console.warn('[SessionService] Error calculating optimal ratio, using default:', error)
      return { vocabRatio: 0.6, grammarRatio: 0.4 }
    }
  }

  /**
   * Xác định range độ khó tối ưu dựa trên user level
   */
  private getOptimalDifficultyRange(): { min: number; max: number } {
    // TODO: Integrate với user level từ database
    // Hiện tại sử dụng range adaptive
    return { min: 3, max: 8 }
  }

  /**
   * Tạo session mới và lưu trực tiếp lên cloud database (không qua local)
   */
  async createSession(questions: Question[], expiryHours: number = 24): Promise<Session> {
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not connected')

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000)

    // Tính toán total_score từ questions (điểm cao nhất mỗi câu)
    const totalScore = questions.reduce((sum, q) => sum + q.scores[0], 0)

    // Trích xuất topics từ questions
    const topicsSet = new Set<string>()
    questions.forEach((q) => {
      if (q.vocabulary_item_ids && q.vocabulary_item_ids.length > 0) {
        topicsSet.add('vocabulary')
      }
      if (q.grammar_points && q.grammar_points.length > 0) {
        topicsSet.add('grammar')
      }
    })

    const session: Session = {
      id: sessionId,
      title: `Auto Session ${new Date().toLocaleString('vi-VN')}`,
      description: `Session gồm ${questions.length} câu hỏi`,
      questions,
      status: 'pending',
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      difficulty_level:
        questions.length > 0
          ? questions.reduce((sum, q) => sum + q.difficulty_level, 0) / questions.length
          : 5,
      total_score: totalScore,
      attempts_allowed: 1,
      target_language: 'en',
      source_language: 'vi',
      topics: Array.from(topicsSet)
    }

    await db.saveSession(session)
    return session
  }

  /**
   * Hoàn thành session: cập nhật trạng thái trực tiếp trên cloud
   */
  async completeSession(sessionId: string): Promise<void> {
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not connected')

    const existing = await db.getSessionById(sessionId)
    if (!existing) throw new Error(`Session not found: ${sessionId}`)

    const updated: Partial<Session> = {
      status: 'completed',
      completed_at: new Date().toISOString()
    }

    await db.updateSession(sessionId, updated)
  }

  /**
   * Lấy danh sách sessions
   */
  async getSessions(filterByExpired?: boolean): Promise<Session[]> {
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not connected')

    let query = 'SELECT * FROM sessions'
    const params: any[] = []

    if (filterByExpired !== undefined) {
      if (filterByExpired) {
        query += ' WHERE expires_at < $1'
      } else {
        query += ' WHERE expires_at >= $1'
      }
      params.push(new Date().toISOString())
    }

    query += ' ORDER BY created_at DESC'

    if (!window.api) throw new Error('Electron API not available')

    const result = await window.api.cloudDatabase.query(query, params)

    if (!result.success) {
      throw new Error(result.error || 'Failed to get sessions')
    }

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title || `Session ${row.id.substring(0, 8)}`,
      description: row.description || '',
      questions: Array.isArray(row.questions) ? row.questions : [],
      status: row.status || 'pending',
      created_at: row.created_at,
      completed_at: row.completed_at,
      expires_at: row.expires_at,
      difficulty_level: row.difficulty_level || 5,
      total_time_spent: row.total_time_spent,
      total_score: row.total_score,
      accuracy_rate: row.accuracy_rate,
      attempts_allowed: row.attempts_allowed || 1,
      target_language: row.target_language || 'en',
      source_language: row.source_language || 'vi',
      topics: Array.isArray(row.topics) ? row.topics : []
    }))
  }

  /**
   * One-time migration: move any existing local sessions in window.api.storage (key 'app_sessions')
   * to the cloud database, then remove the local key.
   * Returns counts of migrated/skipped.
   */
  async migrateLocalSessions(): Promise<{ migrated: number; skipped: number }> {
    if (!window.api) throw new Error('Electron API not available')
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not connected')

    let migrated = 0
    let skipped = 0
    try {
      const localData = await window.api.storage.get('app_sessions')
      const localSessions: any[] = Array.isArray(localData) ? localData : []

      for (const raw of localSessions) {
        // Basic shape validation
        if (!raw || !raw.id) {
          skipped++
          continue
        }

        // Check if already exists in cloud
        const existing = await db.getSessionById(raw.id)
        if (existing) {
          skipped++
          continue
        }

        // Normalize fields
        const session: Session = {
          id: raw.id,
          title: raw.title || `Session ${raw.id.substring(0, 8)}`,
          description: raw.description || '',
          questions: Array.isArray(raw.questions) ? raw.questions : [],
          status: raw.status || 'pending',
          created_at: raw.created_at || new Date().toISOString(),
          completed_at: raw.completed_at,
          expires_at: raw.expires_at,
          difficulty_level: typeof raw.difficulty_level === 'number' ? raw.difficulty_level : 5,
          total_time_spent: raw.total_time_spent,
          total_score: raw.total_score,
          accuracy_rate: raw.accuracy_rate,
          attempts_allowed: raw.attempts_allowed || 1,
          target_language: raw.target_language || 'en',
          source_language: raw.source_language || 'vi',
          topics: Array.isArray(raw.topics) ? raw.topics : []
        }

        await db.saveSession(session)
        migrated++
      }

      // Remove local key after successful migration attempt
      if (localSessions.length > 0) {
        try {
          await window.api.storage.remove('app_sessions')
        } catch (e) {
          console.warn('[SessionService] Could not remove local app_sessions key:', e)
        }
      }
    } catch (error) {
      console.error('[SessionService] migrateLocalSessions error:', error)
      throw error
    }

    return { migrated, skipped }
  }
}

// Singleton instance
let sessionServiceInstance: SessionService | null = null

export const getSessionService = (): SessionService => {
  if (!sessionServiceInstance) {
    sessionServiceInstance = new SessionService()
  }
  return sessionServiceInstance
}
