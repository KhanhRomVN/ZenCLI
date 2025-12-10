import { Session, Question } from '../presentation/pages/Session/types'
import { getCloudDatabase } from './CloudDatabaseService'

export interface AIScoringResult {
  overallScore: number
  accuracyRate: number
  timeEfficiency: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  masteryAdjustments: MasteryAdjustment[]
  nextReviewSchedule: NextReviewItem[]
}

export interface MasteryAdjustment {
  itemId: string
  itemType: 'vocabulary' | 'grammar'
  masteryChange: number
  retentionScore: number
  nextReviewDate: string
  confidenceLevel: number
}

export interface NextReviewItem {
  itemId: string
  itemType: 'vocabulary' | 'grammar'
  reviewDate: string
  priority: 'high' | 'medium' | 'low'
  reason: string
}

export interface UserAnswer {
  questionId: string
  userAnswer: any
  isCorrect: boolean
  timeSpent: number
  question: Question
}

export class AIScoringService {
  /**
   * Đánh giá toàn diện session performance với AI insights
   */
  async evaluateSessionPerformance(
    session: Session,
    userAnswers: UserAnswer[]
  ): Promise<AIScoringResult> {
    const analysis = await this.analyzePerformanceWithAI(session, userAnswers)

    // Cập nhật mastery scores với AI insights
    const masteryAdjustments = await this.updateMasteryScores(session, userAnswers, analysis)

    // Lên lịch review tiếp theo
    const nextReviewSchedule = await this.scheduleNextReviews(masteryAdjustments)

    return {
      overallScore: analysis.overallScore,
      accuracyRate: analysis.accuracyRate,
      timeEfficiency: analysis.timeEfficiency,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      masteryAdjustments,
      nextReviewSchedule
    }
  }

  /**
   * Phân tích performance với AI (mô phỏng - có thể tích hợp AI thực sau)
   */
  private async analyzePerformanceWithAI(
    session: Session,
    userAnswers: UserAnswer[]
  ): Promise<any> {
    // Tính toán metrics cơ bản
    const totalQuestions = session.questions.length
    const correctAnswers = userAnswers.filter((a) => a.isCorrect).length
    const accuracyRate = totalQuestions > 0 ? correctAnswers / totalQuestions : 0

    // Phân tích thời gian
    const totalTime = userAnswers.reduce((sum, a) => sum + a.timeSpent, 0)
    const avgTimePerQuestion = totalQuestions > 0 ? totalTime / totalQuestions : 0
    const timeEfficiency = this.calculateTimeEfficiency(userAnswers)

    // Phân tích điểm mạnh/yếu theo loại câu hỏi
    const questionTypeAnalysis = this.analyzeByQuestionType(userAnswers)
    const difficultyAnalysis = this.analyzeByDifficulty(session.questions, userAnswers)

    return {
      overallScore: Math.round((accuracyRate * 0.6 + timeEfficiency * 0.4) * 100),
      accuracyRate,
      timeEfficiency,
      strengths: this.identifyStrengths(questionTypeAnalysis, difficultyAnalysis),
      weaknesses: this.identifyWeaknesses(questionTypeAnalysis, difficultyAnalysis),
      recommendations: this.generateRecommendations(questionTypeAnalysis, difficultyAnalysis)
    }
  }

  /**
   * Cập nhật mastery scores dựa trên performance
   */
  private async updateMasteryScores(
    session: Session,
    userAnswers: UserAnswer[],
    analysis: any
  ): Promise<MasteryAdjustment[]> {
    const adjustments: MasteryAdjustment[] = []

    for (const question of session.questions) {
      const userAnswer = userAnswers.find((a) => a.questionId === question.id)
      if (!userAnswer) continue

      // Xử lý vocabulary items
      if (question.vocabulary_item_ids && question.vocabulary_item_ids.length > 0) {
        for (const vocabId of question.vocabulary_item_ids) {
          const adjustment = await this.calculateVocabularyAdjustment(
            vocabId,
            question,
            userAnswer,
            analysis
          )
          adjustments.push(adjustment)
          await this.applyVocabularyAdjustment(adjustment)
        }
      }

      // Xử lý grammar items
      if (question.grammar_points && question.grammar_points.length > 0) {
        for (const grammarId of question.grammar_points) {
          const adjustment = await this.calculateGrammarAdjustment(
            grammarId,
            question,
            userAnswer,
            analysis
          )
          adjustments.push(adjustment)
          await this.applyGrammarAdjustment(adjustment)
        }
      }
    }

    return adjustments
  }

  /**
   * Tính toán điều chỉnh cho vocabulary item
   */
  private async calculateVocabularyAdjustment(
    vocabId: string,
    question: Question,
    userAnswer: UserAnswer,
    analysis: any
  ): Promise<MasteryAdjustment> {
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not connected')

    // Lấy thông tin analytics hiện tại
    const currentAnalytics = await this.getVocabularyAnalytics(vocabId)

    // Tính toán các yếu tố ảnh hưởng
    const difficultyFactor = this.calculateDifficultyFactor(question.difficulty_level)
    const timeFactor = this.calculateTimeFactor(userAnswer.timeSpent, question.time_limit)
    const accuracyFactor = userAnswer.isCorrect ? 1.2 : 0.8
    const consistencyFactor = this.calculateConsistencyFactor(currentAnalytics)

    // Tính mastery change
    const baseChange = 0.1 * difficultyFactor * timeFactor * accuracyFactor * consistencyFactor
    const masteryChange = userAnswer.isCorrect ? baseChange : -baseChange * 0.5

    // Tính retention score mới
    const newRetention = this.calculateRetentionScore(
      currentAnalytics?.retention_score || 0.5,
      userAnswer.isCorrect,
      userAnswer.timeSpent,
      question.time_limit
    )

    // Tính confidence level
    const confidenceLevel = this.calculateConfidenceLevel(
      currentAnalytics?.confidence_level || 0,
      userAnswer.isCorrect,
      baseChange
    )

    // Tính next review date
    const nextReviewDate = this.calculateNextReviewDate(
      (currentAnalytics?.mastery_score || 0) + masteryChange,
      newRetention,
      currentAnalytics?.success_count || 0,
      currentAnalytics?.failure_count || 0
    )

    return {
      itemId: vocabId,
      itemType: 'vocabulary',
      masteryChange,
      retentionScore: newRetention,
      nextReviewDate: nextReviewDate.toISOString(),
      confidenceLevel
    }
  }

  /**
   * Tính toán điều chỉnh cho grammar item
   */
  private async calculateGrammarAdjustment(
    grammarId: string,
    question: Question,
    userAnswer: UserAnswer,
    analysis: any
  ): Promise<MasteryAdjustment> {
    // Logic tương tự như vocabulary nhưng có thể có trọng số khác
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not connected')

    const currentAnalytics = await this.getGrammarAnalytics(grammarId)

    const difficultyFactor = this.calculateDifficultyFactor(question.difficulty_level)
    const timeFactor = this.calculateTimeFactor(userAnswer.timeSpent, question.time_limit)
    const accuracyFactor = userAnswer.isCorrect ? 1.2 : 0.8
    const grammarComplexityFactor = this.calculateGrammarComplexityFactor(question)

    const baseChange =
      0.08 * difficultyFactor * timeFactor * accuracyFactor * grammarComplexityFactor
    const masteryChange = userAnswer.isCorrect ? baseChange : -baseChange * 0.6

    const newRetention = this.calculateRetentionScore(
      currentAnalytics?.retention_score || 0.5,
      userAnswer.isCorrect,
      userAnswer.timeSpent,
      question.time_limit
    )

    const confidenceLevel = this.calculateConfidenceLevel(
      currentAnalytics?.confidence_level || 0,
      userAnswer.isCorrect,
      baseChange
    )

    const nextReviewDate = this.calculateNextReviewDate(
      (currentAnalytics?.mastery_score || 0) + masteryChange,
      newRetention,
      currentAnalytics?.success_count || 0,
      currentAnalytics?.failure_count || 0
    )

    return {
      itemId: grammarId,
      itemType: 'grammar',
      masteryChange,
      retentionScore: newRetention,
      nextReviewDate: nextReviewDate.toISOString(),
      confidenceLevel
    }
  }

  /**
   * Áp dụng điều chỉnh cho vocabulary item
   */
  private async applyVocabularyAdjustment(adjustment: MasteryAdjustment): Promise<void> {
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not connected')

    // Lấy analytics hiện tại
    const current = await this.getVocabularyAnalytics(adjustment.itemId)

    const updatedAnalytics = {
      id: current?.id || `va_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vocabulary_item_id: adjustment.itemId,
      mastery_score: Math.max(
        0,
        Math.min(1, (current?.mastery_score || 0) + adjustment.masteryChange)
      ),
      retention_score: adjustment.retentionScore,
      confidence_level: adjustment.confidenceLevel,
      last_reviewed: new Date().toISOString(),
      success_count: (current?.success_count || 0) + (adjustment.masteryChange > 0 ? 1 : 0),
      failure_count: (current?.failure_count || 0) + (adjustment.masteryChange <= 0 ? 1 : 0),
      exposure_count: (current?.exposure_count || 0) + 1,
      next_review_date: adjustment.nextReviewDate,
      updated_at: new Date().toISOString(),
      created_at: current?.created_at || new Date().toISOString()
    }

    // Lưu hoặc cập nhật
    if (current) {
      await this.updateVocabularyAnalytics(updatedAnalytics)
    } else {
      await this.createVocabularyAnalytics(updatedAnalytics)
    }
  }

  /**
   * Áp dụng điều chỉnh cho grammar item
   */
  private async applyGrammarAdjustment(adjustment: MasteryAdjustment): Promise<void> {
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not connected')

    const current = await this.getGrammarAnalytics(adjustment.itemId)

    const updatedAnalytics = {
      id: current?.id || `ga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      grammar_item_id: adjustment.itemId,
      mastery_score: Math.max(
        0,
        Math.min(1, (current?.mastery_score || 0) + adjustment.masteryChange)
      ),
      retention_score: adjustment.retentionScore,
      confidence_level: adjustment.confidenceLevel,
      last_reviewed: new Date().toISOString(),
      success_count: (current?.success_count || 0) + (adjustment.masteryChange > 0 ? 1 : 0),
      failure_count: (current?.failure_count || 0) + (adjustment.masteryChange <= 0 ? 1 : 0),
      exposure_count: (current?.exposure_count || 0) + 1,
      next_review_date: adjustment.nextReviewDate,
      updated_at: new Date().toISOString(),
      created_at: current?.created_at || new Date().toISOString()
    }

    if (current) {
      await this.updateGrammarAnalytics(updatedAnalytics)
    } else {
      await this.createGrammarAnalytics(updatedAnalytics)
    }
  }

  /**
   * Lên lịch review tiếp theo
   */
  private async scheduleNextReviews(adjustments: MasteryAdjustment[]): Promise<NextReviewItem[]> {
    return adjustments.map((adjustment) => ({
      itemId: adjustment.itemId,
      itemType: adjustment.itemType,
      reviewDate: adjustment.nextReviewDate,
      priority: this.calculateReviewPriority(adjustment),
      reason: this.getReviewReason(adjustment)
    }))
  }

  // ========== HELPER METHODS ==========

  private calculateTimeEfficiency(userAnswers: UserAnswer[]): number {
    const optimalTimes = userAnswers.map((a) => a.question.time_limit * 0.7) // 70% time limit là optimal
    const actualTimes = userAnswers.map((a) => a.timeSpent)

    let efficiencySum = 0
    for (let i = 0; i < userAnswers.length; i++) {
      if (actualTimes[i] <= optimalTimes[i]) {
        efficiencySum += 1.0
      } else if (actualTimes[i] <= userAnswers[i].question.time_limit) {
        efficiencySum += 0.7
      } else {
        efficiencySum += 0.3
      }
    }

    return userAnswers.length > 0 ? efficiencySum / userAnswers.length : 0
  }

  private calculateDifficultyFactor(difficulty: number): number {
    // Độ khó càng cao, điểm thưởng càng lớn
    return 0.5 + (difficulty / 10) * 0.5
  }

  private calculateTimeFactor(timeSpent: number, timeLimit: number): number {
    const ratio = timeSpent / timeLimit
    if (ratio <= 0.3) return 1.2 // Rất nhanh
    if (ratio <= 0.7) return 1.0 // Tốt
    if (ratio <= 1.0) return 0.8 // Hơi chậm
    return 0.5 // Quá chậm
  }

  private calculateConsistencyFactor(analytics: any): number {
    if (!analytics) return 1.0
    const total = (analytics.success_count || 0) + (analytics.failure_count || 0)
    if (total === 0) return 1.0
    const successRate = analytics.success_count / total
    return 0.7 + successRate * 0.3 // Thưởng cho consistency
  }

  private calculateGrammarComplexityFactor(question: Question): number {
    const complexTypes = ['grammar_transformation', 'sentence_puzzle']
    return complexTypes.includes(question.question_type) ? 1.2 : 1.0
  }

  private calculateRetentionScore(
    currentRetention: number,
    isCorrect: boolean,
    timeSpent: number,
    timeLimit: number
  ): number {
    const timeFactor = timeSpent <= timeLimit * 0.7 ? 1.1 : 0.9
    const accuracyFactor = isCorrect ? 1.2 : 0.8
    return Math.max(0.1, Math.min(1.0, currentRetention * timeFactor * accuracyFactor))
  }

  private calculateConfidenceLevel(
    currentConfidence: number,
    isCorrect: boolean,
    change: number
  ): number {
    const changeFactor = isCorrect ? change * 100 : -change * 50
    return Math.max(0, Math.min(100, currentConfidence + changeFactor))
  }

  private calculateNextReviewDate(
    mastery: number,
    retention: number,
    successCount: number,
    failureCount: number
  ): Date {
    // Spaced repetition algorithm
    const baseInterval = 1 // 1 ngày cho lần đầu
    const easeFactor = 2.5 + successCount * 0.1 - failureCount * 0.15
    const interval = baseInterval * easeFactor * (1 + mastery) * retention

    const days = Math.max(1, Math.min(30, Math.round(interval)))
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  }

  private calculateReviewPriority(adjustment: MasteryAdjustment): 'high' | 'medium' | 'low' {
    if (adjustment.masteryChange < -0.2) return 'high'
    if (adjustment.masteryChange < 0) return 'medium'
    if (adjustment.confidenceLevel < 30) return 'high'
    if (adjustment.confidenceLevel < 60) return 'medium'
    return 'low'
  }

  private getReviewReason(adjustment: MasteryAdjustment): string {
    if (adjustment.masteryChange < 0) return 'Performance decrease detected'
    if (adjustment.confidenceLevel < 30) return 'Low confidence level'
    if (adjustment.retentionScore < 0.3) return 'Poor retention'
    return 'Scheduled review'
  }

  private analyzeByQuestionType(userAnswers: UserAnswer[]): any {
    const typeAnalysis: any = {}

    userAnswers.forEach((answer) => {
      const type = answer.question.question_type
      if (!typeAnalysis[type]) {
        typeAnalysis[type] = { total: 0, correct: 0, totalTime: 0 }
      }

      typeAnalysis[type].total++
      typeAnalysis[type].correct += answer.isCorrect ? 1 : 0
      typeAnalysis[type].totalTime += answer.timeSpent
    })

    return typeAnalysis
  }

  private analyzeByDifficulty(questions: Question[], userAnswers: UserAnswer[]): any {
    const difficultyAnalysis: any = {}

    questions.forEach((question) => {
      const difficulty = question.difficulty_level
      const answer = userAnswers.find((a) => a.questionId === question.id)

      if (!difficultyAnalysis[difficulty]) {
        difficultyAnalysis[difficulty] = { total: 0, correct: 0, totalTime: 0 }
      }

      difficultyAnalysis[difficulty].total++
      if (answer) {
        difficultyAnalysis[difficulty].correct += answer.isCorrect ? 1 : 0
        difficultyAnalysis[difficulty].totalTime += answer.timeSpent
      }
    })

    return difficultyAnalysis
  }

  private identifyStrengths(typeAnalysis: any, difficultyAnalysis: any): string[] {
    const strengths: string[] = []

    // Xác định điểm mạnh theo loại câu hỏi
    Object.entries(typeAnalysis).forEach(([type, data]: [string, any]) => {
      const accuracy = data.total > 0 ? data.correct / data.total : 0
      if (accuracy >= 0.8) {
        strengths.push(`High accuracy in ${type} questions`)
      }
    })

    // Xác định điểm mạnh theo độ khó
    Object.entries(difficultyAnalysis).forEach(([difficulty, data]: [string, any]) => {
      const accuracy = data.total > 0 ? data.correct / data.total : 0
      if (accuracy >= 0.7 && parseInt(difficulty) >= 7) {
        strengths.push(`Good performance on high difficulty (level ${difficulty})`)
      }
    })

    return strengths
  }

  private identifyWeaknesses(typeAnalysis: any, difficultyAnalysis: any): string[] {
    const weaknesses: string[] = []

    Object.entries(typeAnalysis).forEach(([type, data]: [string, any]) => {
      const accuracy = data.total > 0 ? data.correct / data.total : 0
      if (accuracy <= 0.5 && data.total >= 2) {
        weaknesses.push(`Low accuracy in ${type} questions`)
      }
    })

    Object.entries(difficultyAnalysis).forEach(([difficulty, data]: [string, any]) => {
      const accuracy = data.total > 0 ? data.correct / data.total : 0
      if (accuracy <= 0.4 && data.total >= 2) {
        weaknesses.push(`Struggling with difficulty level ${difficulty}`)
      }
    })

    return weaknesses
  }

  private generateRecommendations(typeAnalysis: any, difficultyAnalysis: any): string[] {
    const recommendations: string[] = []

    // Recommendations based on question type performance
    Object.entries(typeAnalysis).forEach(([type, data]: [string, any]) => {
      const accuracy = data.total > 0 ? data.correct / data.total : 0
      if (accuracy <= 0.6) {
        recommendations.push(`Practice more ${type} questions to improve accuracy`)
      }
    })

    // Recommendations based on difficulty
    const difficulties = Object.keys(difficultyAnalysis)
      .map(Number)
      .sort((a, b) => a - b)
    if (difficulties.length > 0) {
      const maxDifficulty = Math.max(...difficulties)
      const minDifficulty = Math.min(...difficulties)

      if (maxDifficulty - minDifficulty >= 3) {
        recommendations.push('Focus on medium difficulty questions to build solid foundation')
      }
    }

    return recommendations
  }

  // ========== DATABASE OPERATIONS ==========

  private async getVocabularyAnalytics(vocabId: string): Promise<any> {
    if (!window.api) throw new Error('Electron API not available')

    const result = await window.api.cloudDatabase.query(
      'SELECT * FROM vocabulary_analytics WHERE vocabulary_item_id = $1',
      [vocabId]
    )

    return result.success && result.rows.length > 0 ? result.rows[0] : null
  }

  private async getGrammarAnalytics(grammarId: string): Promise<any> {
    if (!window.api) throw new Error('Electron API not available')

    const result = await window.api.cloudDatabase.query(
      'SELECT * FROM grammar_analytics WHERE grammar_item_id = $1',
      [grammarId]
    )

    return result.success && result.rows.length > 0 ? result.rows[0] : null
  }

  private async createVocabularyAnalytics(analytics: any): Promise<void> {
    if (!window.api) throw new Error('Electron API not available')

    const query = `
 INSERT INTO vocabulary_analytics (
 id, vocabulary_item_id, mastery_score, retention_score, confidence_level,
 last_reviewed, success_count, failure_count, exposure_count,
 next_review_date, created_at, updated_at
 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
 `

    const params = [
      analytics.id,
      analytics.vocabulary_item_id,
      analytics.mastery_score,
      analytics.retention_score,
      analytics.confidence_level,
      analytics.last_reviewed,
      analytics.success_count,
      analytics.failure_count,
      analytics.exposure_count,
      analytics.next_review_date,
      analytics.created_at,
      analytics.updated_at
    ]

    const result = await window.api.cloudDatabase.query(query, params)
    if (!result.success) {
      throw new Error('Failed to create vocabulary analytics')
    }
  }

  private async updateVocabularyAnalytics(analytics: any): Promise<void> {
    if (!window.api) throw new Error('Electron API not available')

    const query = `
 UPDATE vocabulary_analytics SET
 mastery_score = $1,
 retention_score = $2,
 confidence_level = $3,
 last_reviewed = $4,
 success_count = $5,
 failure_count = $6,
 exposure_count = $7,
 next_review_date = $8,
 updated_at = $9
 WHERE vocabulary_item_id = $10
 `

    const params = [
      analytics.mastery_score,
      analytics.retention_score,
      analytics.confidence_level,
      analytics.last_reviewed,
      analytics.success_count,
      analytics.failure_count,
      analytics.exposure_count,
      analytics.next_review_date,
      analytics.updated_at,
      analytics.vocabulary_item_id
    ]

    const result = await window.api.cloudDatabase.query(query, params)
    if (!result.success) {
      throw new Error('Failed to update vocabulary analytics')
    }
  }

  private async createGrammarAnalytics(analytics: any): Promise<void> {
    if (!window.api) throw new Error('Electron API not available')

    const query = `
 INSERT INTO grammar_analytics (
 id, grammar_item_id, mastery_score, retention_score, confidence_level,
 last_reviewed, success_count, failure_count, exposure_count,
 next_review_date, created_at, updated_at
 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
 `

    const params = [
      analytics.id,
      analytics.grammar_item_id,
      analytics.mastery_score,
      analytics.retention_score,
      analytics.confidence_level,
      analytics.last_reviewed,
      analytics.success_count,
      analytics.failure_count,
      analytics.exposure_count,
      analytics.next_review_date,
      analytics.created_at,
      analytics.updated_at
    ]

    const result = await window.api.cloudDatabase.query(query, params)
    if (!result.success) {
      throw new Error('Failed to create grammar analytics')
    }
  }

  private async updateGrammarAnalytics(analytics: any): Promise<void> {
    if (!window.api) throw new Error('Electron API not available')

    const query = `
 UPDATE grammar_analytics SET
 mastery_score = $1,
 retention_score = $2,
 confidence_level = $3,
 last_reviewed = $4,
 success_count = $5,
 failure_count = $6,
 exposure_count = $7,
 next_review_date = $8,
 updated_at = $9
 WHERE grammar_item_id = $10
 `

    const params = [
      analytics.mastery_score,
      analytics.retention_score,
      analytics.confidence_level,
      analytics.last_reviewed,
      analytics.success_count,
      analytics.failure_count,
      analytics.exposure_count,
      analytics.next_review_date,
      analytics.updated_at,
      analytics.grammar_item_id
    ]

    const result = await window.api.cloudDatabase.query(query, params)
    if (!result.success) {
      throw new Error('Failed to update grammar analytics')
    }
  }
}

// Singleton instance
let aiScoringServiceInstance: AIScoringService | null = null

export const getAIScoringService = (): AIScoringService => {
  if (!aiScoringServiceInstance) {
    aiScoringServiceInstance = new AIScoringService()
  }
  return aiScoringServiceInstance
}
