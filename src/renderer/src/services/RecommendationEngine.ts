import { Session } from '../presentation/pages/Session/types'
import { getCloudDatabase } from './CloudDatabaseService'

export interface LearningRecommendation {
  type: 'session_focus' | 'practice_intensity' | 'question_types' | 'study_time' | 'review_schedule'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionItems: string[]
  estimatedImpact: number // 0-100
  confidence: number // 0-100
}

export interface UserLearningProfile {
  userId: string
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  preferredPace: 'slow' | 'moderate' | 'fast'
  focusAreas: string[]
  weaknessPatterns: WeaknessPattern[]
  strengthPatterns: StrengthPattern[]
  consistencyScore: number
  improvementRate: number
  optimalStudyTime: string
}

export interface WeaknessPattern {
  category: 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'writing'
  subcategory: string
  severity: 'low' | 'medium' | 'high'
  frequency: number
  lastOccurred: string
}

export interface StrengthPattern {
  category: 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'writing'
  subcategory: string
  proficiency: 'beginner' | 'intermediate' | 'advanced'
  consistency: number
}

export class RecommendationEngine {
  /**
   * Tạo recommendations cá nhân hóa dựa trên learning profile và history
   */
  async generatePersonalizedRecommendations(userId: string): Promise<LearningRecommendation[]> {
    const learningProfile = await this.analyzeLearningProfile(userId)
    const weaknessAreas = await this.identifyWeaknessAreas(userId)
    const recentPerformance = await this.getRecentPerformance(userId)
    const learningPatterns = await this.analyzeLearningPatterns(userId)

    const recommendations: LearningRecommendation[] = []

    // 1. Recommendations về focus areas
    recommendations.push(
      ...(await this.generateFocusRecommendations(weaknessAreas, learningProfile))
    )

    // 2. Recommendations về practice intensity
    recommendations.push(
      ...(await this.generateIntensityRecommendations(recentPerformance, learningPatterns))
    )

    // 3. Recommendations về question types
    recommendations.push(
      ...(await this.generateQuestionTypeRecommendations(weaknessAreas, learningProfile))
    )

    // 4. Recommendations về study time optimization
    recommendations.push(...(await this.generateStudyTimeRecommendations(learningPatterns)))

    // 5. Recommendations về review schedule
    recommendations.push(...(await this.generateReviewRecommendations(weaknessAreas)))

    // Sắp xếp theo priority và impact
    return this.prioritizeRecommendations(recommendations)
  }

  /**
   * Phân tích learning profile của user
   */
  private async analyzeLearningProfile(userId: string): Promise<UserLearningProfile> {
    const db = getCloudDatabase()
    if (!db) throw new Error('Database not available')

    // Lấy session history để phân tích
    const sessions = await this.getUserSessions(userId)
    const performanceMetrics = await this.calculatePerformanceMetrics(sessions)
    const learningPatterns = await this.identifyLearningPatterns(sessions)

    return {
      userId,
      learningStyle: this.determineLearningStyle(sessions),
      preferredPace: this.determinePreferredPace(sessions),
      focusAreas: this.identifyFocusAreas(performanceMetrics),
      weaknessPatterns: await this.identifyWeaknessPatterns(sessions),
      strengthPatterns: await this.identifyStrengthPatterns(sessions),
      consistencyScore: this.calculateConsistencyScore(sessions),
      improvementRate: this.calculateImprovementRate(sessions),
      optimalStudyTime: await this.determineOptimalStudyTime(userId)
    }
  }

  /**
   * Xác định weakness areas
   */
  private async identifyWeaknessAreas(userId: string): Promise<WeaknessPattern[]> {
    const sessions = await this.getUserSessions(userId)
    return this.identifyWeaknessPatterns(sessions)
  }

  /**
   * Lấy recent performance
   */
  private async getRecentPerformance(userId: string): Promise<any> {
    const sessions = await this.getUserSessions(userId, 30) // 30 days
    return this.calculatePerformanceMetrics(sessions)
  }

  /**
   * Phân tích learning patterns
   */
  private async analyzeLearningPatterns(userId: string): Promise<any> {
    const sessions = await this.getUserSessions(userId, 90) // 90 days
    return {
      consistency: this.calculateConsistencyScore(sessions),
      improvement: this.calculateImprovementRate(sessions),
      engagement: this.calculateEngagementLevel(sessions),
      retention: this.calculateRetentionRate(sessions)
    }
  }

  /**
   * Tạo recommendations về focus areas
   */
  private async generateFocusRecommendations(
    weaknesses: WeaknessPattern[],
    profile: UserLearningProfile
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = []

    // Focus on high severity weaknesses
    const highSeverityWeaknesses = weaknesses.filter((w) => w.severity === 'high')
    if (highSeverityWeaknesses.length > 0) {
      const topWeakness = highSeverityWeaknesses[0]
      recommendations.push({
        type: 'session_focus',
        title: `Tập trung vào ${this.getCategoryDisplayName(topWeakness.category)}`,
        description: `Bạn đang gặp khó khăn với ${this.getCategoryDisplayName(topWeakness.category)}. Hãy dành 60% thời gian học cho lĩnh vực này.`,
        priority: 'high',
        actionItems: [
          `Thực hành ${this.getCategoryDisplayName(topWeakness.category)} ít nhất 15 phút mỗi ngày`,
          `Tập trung vào các bài tập ${topWeakness.subcategory}`,
          `Xem lại các lỗi thường gặp trong lĩnh vực này`
        ],
        estimatedImpact: 85,
        confidence: 90
      })
    }

    // Balance recommendations
    if (weaknesses.length >= 3) {
      recommendations.push({
        type: 'session_focus',
        title: 'Cân bằng các kỹ năng học tập',
        description:
          'Bạn có nhiều điểm cần cải thiện. Hãy phân bổ thời gian học hợp lý giữa các kỹ năng.',
        priority: 'medium',
        actionItems: [
          'Phân chia thời gian: 40% cho điểm yếu nhất, 30% cho điểm yếu thứ hai, 30% cho ôn tập',
          'Tạo lịch học tuần với các chủ đề đa dạng',
          'Đánh giá tiến độ hàng tuần'
        ],
        estimatedImpact: 70,
        confidence: 80
      })
    }

    return recommendations
  }

  /**
   * Tạo recommendations về practice intensity
   */
  private async generateIntensityRecommendations(
    performance: any,
    patterns: any
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = []

    // Intensity based on consistency
    if (patterns.consistency < 0.6) {
      recommendations.push({
        type: 'practice_intensity',
        title: 'Tăng cường tính nhất quán trong học tập',
        description: 'Việc học của bạn chưa đều đặn. Hãy thiết lập thói quen học tập hàng ngày.',
        priority: 'high',
        actionItems: [
          'Học ít nhất 20 phút mỗi ngày',
          'Đặt lịch học cố định trong ngày',
          'Sử dụng tính năng nhắc nhở học tập'
        ],
        estimatedImpact: 75,
        confidence: 85
      })
    }

    // Intensity based on improvement rate
    if (patterns.improvement < 0.1) {
      recommendations.push({
        type: 'practice_intensity',
        title: 'Tăng cường độ luyện tập',
        description: 'Tốc độ cải thiện của bạn chậm. Hãy tăng thời gian và cường độ luyện tập.',
        priority: 'medium',
        actionItems: [
          'Tăng thời gian học lên 30-45 phút mỗi ngày',
          'Thực hành các bài tập có độ khó cao hơn',
          'Ôn tập lại các bài đã học sau 24 giờ'
        ],
        estimatedImpact: 65,
        confidence: 75
      })
    }

    return recommendations
  }

  /**
   * Tạo recommendations về question types
   */
  private async generateQuestionTypeRecommendations(
    weaknesses: WeaknessPattern[],
    profile: UserLearningProfile
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = []

    // Question type recommendations based on learning style
    const learningStyleMap = {
      visual: ['sentence_puzzle', 'matching', 'true_false'],
      auditory: ['translate', 'reverse_translation', 'choice_one'],
      kinesthetic: ['gap_fill', 'grammar_transformation', 'lexical_fix'],
      mixed: ['all_types']
    }

    const recommendedTypes = learningStyleMap[profile.learningStyle] || learningStyleMap.mixed

    recommendations.push({
      type: 'question_types',
      title: `Tối ưu loại câu hỏi cho phong cách học ${profile.learningStyle}`,
      description: `Dựa trên phong cách học tập của bạn, các loại câu hỏi ${recommendedTypes.join(', ')} sẽ hiệu quả nhất.`,
      priority: 'medium',
      actionItems: [
        `Ưu tiên các bài tập ${recommendedTypes.join(' và ')}`,
        'Kết hợp đa dạng loại câu hỏi trong mỗi buổi học',
        'Theo dõi hiệu quả của từng loại câu hỏi'
      ],
      estimatedImpact: 60,
      confidence: 70
    })

    return recommendations
  }

  /**
   * Tạo recommendations về study time
   */
  private async generateStudyTimeRecommendations(patterns: any): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = []

    // Study time based on engagement patterns
    if (patterns.engagement < 0.5) {
      recommendations.push({
        type: 'study_time',
        title: 'Tối ưu hóa thời gian học tập',
        description:
          'Mức độ tập trung của bạn có thể được cải thiện bằng cách chọn thời gian học phù hợp.',
        priority: 'medium',
        actionItems: [
          'Thử học vào buổi sáng khi tinh thần minh mẫn',
          'Chia nhỏ thời gian học thành các phiên 25 phút',
          'Nghỉ ngơi 5 phút sau mỗi phiên học'
        ],
        estimatedImpact: 55,
        confidence: 65
      })
    }

    return recommendations
  }

  /**
   * Tạo recommendations về review schedule
   */
  private async generateReviewRecommendations(
    weaknesses: WeaknessPattern[]
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = []

    // Review schedule for weak areas
    weaknesses.forEach((weakness) => {
      if (weakness.severity === 'high') {
        recommendations.push({
          type: 'review_schedule',
          title: `Lên lịch ôn tập cho ${this.getCategoryDisplayName(weakness.category)}`,
          description: `Ôn tập định kỳ sẽ giúp củng cố kiến thức về ${weakness.subcategory}.`,
          priority: 'high',
          actionItems: [
            `Ôn tập ${this.getCategoryDisplayName(weakness.category)} sau 1, 3, 7 ngày`,
            'Sử dụng tính năng spaced repetition',
            'Ghi chú lại các lỗi thường gặp'
          ],
          estimatedImpact: 80,
          confidence: 85
        })
      }
    })

    return recommendations
  }

  /**
   * Sắp xếp recommendations theo priority và impact
   */
  private prioritizeRecommendations(
    recommendations: LearningRecommendation[]
  ): LearningRecommendation[] {
    return recommendations.sort((a, b) => {
      // Priority score calculation
      const priorityScore = (rec: LearningRecommendation) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 }
        return priorityWeight[rec.priority] * rec.estimatedImpact * (rec.confidence / 100)
      }

      return priorityScore(b) - priorityScore(a)
    })
  }

  // ========== HELPER METHODS ==========

  private async getUserSessions(userId: string, days: number = 90): Promise<Session[]> {
    if (!window.api) throw new Error('Electron API not available')

    const result = await window.api.cloudDatabase.query(
      `SELECT * FROM sessions 
 WHERE completed_at IS NOT NULL 
 AND created_at >= NOW() - INTERVAL '${days} days'
 ORDER BY created_at DESC`
    )

    return result.success ? result.rows : []
  }

  private calculatePerformanceMetrics(sessions: Session[]): any {
    if (sessions.length === 0) return {}

    const totalSessions = sessions.length
    const totalQuestions = sessions.reduce((sum, s) => sum + s.questions.length, 0)
    const totalCorrect = sessions.reduce((sum, s) => {
      const correctInSession = s.questions.filter((q) => q.is_correct).length
      return sum + correctInSession
    }, 0)

    const accuracyRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0
    const avgDifficulty =
      sessions.reduce((sum, s) => sum + (s.difficulty_level || 5), 0) / totalSessions
    const avgTimeSpent =
      sessions.reduce((sum, s) => sum + (s.total_time_spent || 0), 0) / totalSessions

    return {
      accuracyRate,
      avgDifficulty,
      avgTimeSpent,
      totalSessions,
      totalQuestions
    }
  }

  private async identifyLearningPatterns(sessions: Session[]): Promise<any> {
    // Implement learning pattern analysis
    return {
      consistency: this.calculateConsistencyScore(sessions),
      improvement: this.calculateImprovementRate(sessions),
      engagement: this.calculateEngagementLevel(sessions),
      retention: this.calculateRetentionRate(sessions)
    }
  }

  private determineLearningStyle(sessions: Session[]): UserLearningProfile['learningStyle'] {
    // Simplified learning style detection based on question type performance
    // In real implementation, this would be more sophisticated
    const typePerformance = this.analyzeQuestionTypePerformance(sessions)

    if (
      typePerformance.visual > typePerformance.auditory &&
      typePerformance.visual > typePerformance.kinesthetic
    ) {
      return 'visual'
    } else if (
      typePerformance.auditory > typePerformance.visual &&
      typePerformance.auditory > typePerformance.kinesthetic
    ) {
      return 'auditory'
    } else if (
      typePerformance.kinesthetic > typePerformance.visual &&
      typePerformance.kinesthetic > typePerformance.auditory
    ) {
      return 'kinesthetic'
    }

    return 'mixed'
  }

  private determinePreferredPace(sessions: Session[]): UserLearningProfile['preferredPace'] {
    const avgTimePerQuestion = this.calculateAverageTimePerQuestion(sessions)

    if (avgTimePerQuestion < 30) return 'fast'
    if (avgTimePerQuestion < 60) return 'moderate'
    return 'slow'
  }

  private identifyFocusAreas(performance: any): string[] {
    const focusAreas: string[] = []

    if (performance.accuracyRate < 0.6) focusAreas.push('improve_accuracy')
    if (performance.avgDifficulty < 4) focusAreas.push('increase_difficulty')
    if (performance.avgTimeSpent > 300) focusAreas.push('improve_efficiency')

    return focusAreas
  }

  private async identifyWeaknessPatterns(sessions: Session[]): Promise<WeaknessPattern[]> {
    const weaknesses: WeaknessPattern[] = []

    // Analyze question type weaknesses
    const typePerformance = this.analyzeQuestionTypePerformance(sessions)
    Object.entries(typePerformance).forEach(([type, accuracy]) => {
      const accuracyValue = accuracy as number
      if (accuracyValue < 0.6) {
        weaknesses.push({
          category: this.mapQuestionTypeToCategory(type),
          subcategory: type,
          severity: accuracyValue < 0.4 ? 'high' : accuracyValue < 0.6 ? 'medium' : 'low',
          frequency: this.calculateFrequency(sessions, type),
          lastOccurred: new Date().toISOString()
        })
      }
    })

    return weaknesses
  }

  private async identifyStrengthPatterns(sessions: Session[]): Promise<StrengthPattern[]> {
    const strengths: StrengthPattern[] = []

    const typePerformance = this.analyzeQuestionTypePerformance(sessions)
    Object.entries(typePerformance).forEach(([type, accuracy]) => {
      const accuracyValue = accuracy as number
      if (accuracyValue > 0.8) {
        strengths.push({
          category: this.mapQuestionTypeToCategory(type),
          subcategory: type,
          proficiency:
            accuracyValue > 0.9 ? 'advanced' : accuracyValue > 0.8 ? 'intermediate' : 'beginner',
          consistency: this.calculateConsistency(sessions, type)
        })
      }
    })

    return strengths
  }

  private calculateConsistencyScore(sessions: Session[]): number {
    if (sessions.length < 2) return 0.5

    const sessionDates = sessions.map((s) => new Date(s.created_at).getTime())
    const dateDifferences = []

    for (let i = 1; i < sessionDates.length; i++) {
      dateDifferences.push(sessionDates[i] - sessionDates[i - 1])
    }

    const avgDifference =
      dateDifferences.reduce((sum, diff) => sum + diff, 0) / dateDifferences.length
    const consistency = 1 / (1 + avgDifference / (24 * 60 * 60 * 1000)) // Normalize to 0-1 scale

    return Math.min(1, consistency)
  }

  private calculateImprovementRate(sessions: Session[]): number {
    if (sessions.length < 3) return 0

    const recentSessions = sessions.slice(0, Math.floor(sessions.length / 2))
    const olderSessions = sessions.slice(Math.floor(sessions.length / 2))

    const recentAccuracy =
      recentSessions.reduce((sum, s) => sum + (s.accuracy_rate || 0), 0) / recentSessions.length
    const olderAccuracy =
      olderSessions.reduce((sum, s) => sum + (s.accuracy_rate || 0), 0) / olderSessions.length

    return recentAccuracy - olderAccuracy
  }

  private calculateEngagementLevel(sessions: Session[]): number {
    if (sessions.length === 0) return 0

    const totalTime = sessions.reduce((sum, s) => sum + (s.total_time_spent || 0), 0)
    const avgTimePerSession = totalTime / sessions.length

    // Normalize engagement level (0-1 scale)
    return Math.min(1, avgTimePerSession / 600) // 10 minutes per session = 1.0
  }

  private calculateRetentionRate(sessions: Session[]): number {
    // Simplified retention calculation
    // In real implementation, this would track item mastery over time
    return 0.7 // Placeholder
  }

  private analyzeQuestionTypePerformance(sessions: Session[]): any {
    const typeStats: any = {}
    const typeCounts: any = {}

    sessions.forEach((session) => {
      session.questions.forEach((question) => {
        const type = question.question_type
        if (!typeStats[type]) {
          typeStats[type] = { correct: 0, total: 0 }
          typeCounts[type] = 0
        }

        typeStats[type].total++
        typeCounts[type]++
        if (question.is_correct) {
          typeStats[type].correct++
        }
      })
    })

    const performance: any = {}
    Object.keys(typeStats).forEach((type) => {
      performance[type] =
        typeStats[type].total > 0 ? typeStats[type].correct / typeStats[type].total : 0
    })

    return performance
  }

  private calculateAverageTimePerQuestion(sessions: Session[]): number {
    const totalQuestions = sessions.reduce((sum, s) => sum + s.questions.length, 0)
    const totalTime = sessions.reduce((sum, s) => sum + (s.total_time_spent || 0), 0)

    return totalQuestions > 0 ? totalTime / totalQuestions : 0
  }

  private calculateFrequency(sessions: Session[], type: string): number {
    const typeOccurrences = sessions.filter((s) =>
      s.questions.some((q) => q.question_type === type)
    ).length

    return typeOccurrences / sessions.length
  }

  private calculateConsistency(sessions: Session[], type: string): number {
    const typeSessions = sessions.filter((s) => s.questions.some((q) => q.question_type === type))

    if (typeSessions.length < 2) return 0.5

    const accuracies = typeSessions.map((s) => {
      const typeQuestions = s.questions.filter((q) => q.question_type === type)
      const correct = typeQuestions.filter((q) => q.is_correct).length
      return typeQuestions.length > 0 ? correct / typeQuestions.length : 0
    })

    const variance = this.calculateVariance(accuracies)
    return 1 / (1 + variance) // Higher consistency = lower variance
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length
    const squaredDiffs = numbers.map((num) => Math.pow(num - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length
  }

  private mapQuestionTypeToCategory(type: string): WeaknessPattern['category'] {
    const categoryMap: any = {
      lexical_fix: 'vocabulary',
      grammar_transformation: 'grammar',
      sentence_puzzle: 'reading',
      translate: 'writing',
      reverse_translation: 'writing',
      gap_fill: 'writing',
      choice_one: 'reading',
      choice_multi: 'reading',
      matching: 'vocabulary',
      true_false: 'reading'
    }

    return categoryMap[type] || 'vocabulary'
  }

  private getCategoryDisplayName(category: string): string {
    const displayNames: any = {
      vocabulary: 'từ vựng',
      grammar: 'ngữ pháp',
      reading: 'đọc hiểu',
      writing: 'viết',
      listening: 'nghe'
    }

    return displayNames[category] || category
  }

  private async determineOptimalStudyTime(userId: string): Promise<string> {
    // Simplified implementation - in real app, this would analyze user activity patterns
    return 'morning' // morning, afternoon, evening, night
  }
}

// Singleton instance
let recommendationEngineInstance: RecommendationEngine | null = null

export const getRecommendationEngine = (): RecommendationEngine => {
  if (!recommendationEngineInstance) {
    recommendationEngineInstance = new RecommendationEngine()
  }
  return recommendationEngineInstance
}
