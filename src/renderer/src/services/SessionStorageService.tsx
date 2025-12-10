import { Session } from '../presentation/pages/Session/types'

const SESSION_STORAGE_KEY = 'app_sessions'
const QUESTIONS_STORAGE_PREFIX = 'session_questions_'

export class SessionStorageService {
  /**
   * Lưu session vào localStorage
   */
  async saveSession(session: Session): Promise<void> {
    if (!window.api) throw new Error('Electron API not available')

    try {
      const sessions = await this.getAllSessions()
      const existingIndex = sessions.findIndex((s) => s.id === session.id)

      if (existingIndex !== -1) {
        sessions[existingIndex] = session
      } else {
        sessions.push(session)
      }

      await window.api.storage.set(SESSION_STORAGE_KEY, sessions)
    } catch (error) {
      console.error('[SessionStorageService] ❌ Error saving session:', error)
      throw error
    }
  }

  /**
   * Lưu session hoàn thành vào cloud database
   */
  async saveSessionToCloud(session: Session): Promise<void> {
    if (!window.api) throw new Error('Electron API not available')

    try {
      const query = `
      INSERT INTO sessions (
        id, title, description, questions, status, created_at, completed_at,
        expires_at, difficulty_level, total_time_spent, total_score, accuracy_rate,
        attempts_allowed, target_language, source_language, topics, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        questions = EXCLUDED.questions,
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        total_time_spent = EXCLUDED.total_time_spent,
        total_score = EXCLUDED.total_score,
        accuracy_rate = EXCLUDED.accuracy_rate,
        updated_at = EXCLUDED.updated_at
    `

      // ✅ FIX: Round difficulty_level về số nguyên
      const roundedDifficultyLevel = session.difficulty_level
        ? Math.round(session.difficulty_level)
        : null

      // ✅ FIX: Round accuracy_rate về 2 chữ số thập phân
      const roundedAccuracyRate = session.accuracy_rate
        ? Math.round(session.accuracy_rate * 100) / 100
        : null

      const params = [
        session.id,
        session.title,
        session.description || null,
        JSON.stringify(session.questions),
        session.status,
        session.created_at,
        session.completed_at || null,
        session.expires_at || null,
        roundedDifficultyLevel, // ✅ Đã làm tròn
        session.total_time_spent || null,
        session.total_score || null,
        roundedAccuracyRate, // ✅ Đã làm tròn
        session.attempts_allowed,
        session.target_language,
        session.source_language,
        JSON.stringify(session.topics),
        new Date().toISOString()
      ]

      const result = await window.api.cloudDatabase.query(query, params)

      if (!result.success) {
        throw new Error(result.error || 'Failed to save session to cloud')
      }
    } catch (error) {
      console.error('[SessionStorageService] ❌ Error saving session to cloud:', error)
      throw error
    }
  }

  /**
   * Lấy tất cả sessions
   */
  async getAllSessions(): Promise<Session[]> {
    if (!window.api) throw new Error('Electron API not available')

    try {
      const sessions = await window.api.storage.get(SESSION_STORAGE_KEY)
      return Array.isArray(sessions) ? sessions : []
    } catch (error) {
      console.error('[SessionStorageService] ❌ Error getting sessions:', error)
      return []
    }
  }

  /**
   * Lấy session theo ID
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    const sessions = await this.getAllSessions()
    return sessions.find((s) => s.id === sessionId) || null
  }

  /**
   * Lấy sessions theo trạng thái (pending/completed/expired)
   */
  async getSessionsByStatus(filterByExpired?: boolean): Promise<Session[]> {
    const sessions = await this.getAllSessions()
    const now = new Date().toISOString()

    if (filterByExpired === undefined) {
      return sessions
    }

    return sessions.filter((session) => {
      if (!session.expires_at) return false

      if (filterByExpired) {
        return session.expires_at < now
      } else {
        return session.expires_at >= now
      }
    })
  }

  /**
   * Cập nhật session (ví dụ: đánh dấu completed)
   */
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    if (!window.api) throw new Error('Electron API not available')

    try {
      const sessions = await this.getAllSessions()
      const index = sessions.findIndex((s) => s.id === sessionId)

      if (index === -1) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      sessions[index] = { ...sessions[index], ...updates }
      await window.api.storage.set(SESSION_STORAGE_KEY, sessions)
    } catch (error) {
      console.error('[SessionStorageService] ❌ Error updating session:', error)
      throw error
    }
  }

  /**
   * Xóa session và questions liên quan
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!window.api) throw new Error('Electron API not available')

    try {
      // 1. Xóa session
      const sessions = await this.getAllSessions()
      const filteredSessions = sessions.filter((s) => s.id !== sessionId)
      await window.api.storage.set(SESSION_STORAGE_KEY, filteredSessions)

      // 2. Xóa questions
      const storageKey = `${QUESTIONS_STORAGE_PREFIX}${sessionId}`
      await window.api.storage.remove(storageKey)
    } catch (error) {
      console.error('[SessionStorageService] ❌ Error deleting session:', error)
      throw error
    }
  }

  /**
   * Đếm số lượng pending sessions
   */
  async countPendingSessions(): Promise<number> {
    const sessions = await this.getSessionsByStatus(false) // false = chưa hết hạn
    return sessions.length
  }
}

// Singleton instance
let sessionStorageInstance: SessionStorageService | null = null

export const getSessionStorageService = (): SessionStorageService => {
  if (!sessionStorageInstance) {
    sessionStorageInstance = new SessionStorageService()
  }
  return sessionStorageInstance
}
