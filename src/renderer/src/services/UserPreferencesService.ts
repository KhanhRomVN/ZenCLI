import { UserPreferences, PromptEnhancementContext } from '../types/userPreferences'

const USER_PREFERENCES_STORAGE_KEY = 'user_preferences'

export class UserPreferencesService {
  /**
   * Lưu user preferences vào storage
   */
  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }
      const preferencesToSave = {
        ...preferences,
        updatedAt: new Date().toISOString(),
        createdAt: preferences.createdAt || new Date().toISOString()
      }
      await window.api.storage.set(USER_PREFERENCES_STORAGE_KEY, preferencesToSave)
    } catch (error) {
      console.error('Error saving user preferences:', error)
      throw new Error('Không thể lưu cài đặt người dùng')
    }
  }

  /**
   * Lấy user preferences từ storage
   */
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }
      const preferences = await window.api.storage.get(USER_PREFERENCES_STORAGE_KEY)
      return preferences || {}
    } catch (error) {
      console.error('Error loading user preferences:', error)
      return {}
    }
  }

  /**
   * Cập nhật một phần user preferences
   */
  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const currentPreferences = await this.getUserPreferences()
      const updatedPreferences = {
        ...currentPreferences,
        ...updates,
        updatedAt: new Date().toISOString()
      }
      await this.saveUserPreferences(updatedPreferences)
      return updatedPreferences
    } catch (error) {
      console.error('Error updating user preferences:', error)
      throw new Error('Không thể cập nhật cài đặt người dùng')
    }
  }

  /**
   * Tạo context để cải thiện prompt dựa trên user preferences
   */
  async getPromptEnhancementContext(): Promise<PromptEnhancementContext> {
    const preferences = await this.getUserPreferences()

    return {
      userAge: preferences.age,
      userInterests: preferences.interests,
      learningGoals: preferences.learningGoals,
      learningStyle: preferences.learningStyle,
      difficultyLevel: preferences.difficultyLevel,
      preferredLanguage: preferences.preferredLanguage,
      tonePreference: preferences.tonePreference,
      detailLevel: preferences.detailLevel
    }
  }

  /**
   * Tạo enhanced prompt với context từ user preferences
   */
  async createEnhancedPrompt(basePrompt: string): Promise<string> {
    const context = await this.getPromptEnhancementContext()

    let enhancedPrompt = basePrompt

    // Thêm context về tuổi nếu có
    if (context.userAge) {
      enhancedPrompt += `

Người dùng ${context.userAge} tuổi.`
    }

    // Thêm context về sở thích nếu có
    if (context.userInterests && context.userInterests.length > 0) {
      enhancedPrompt += `
Sở thích: ${context.userInterests.join(', ')}.`
    }

    // Thêm context về mục tiêu học tập nếu có
    if (context.learningGoals && context.learningGoals.length > 0) {
      enhancedPrompt += `
Mục tiêu học tập: ${context.learningGoals.join(', ')}.`
    }

    // Thêm context về phong cách học tập nếu có
    if (context.learningStyle) {
      enhancedPrompt += `
Phong cách học tập: ${this.getLearningStyleDescription(context.learningStyle)}.`
    }

    // Thêm context về độ khó nếu có
    if (context.difficultyLevel) {
      enhancedPrompt += `
Trình độ: ${context.difficultyLevel}.`
    }

    // Thêm hướng dẫn về tone và detail level
    if (context.tonePreference) {
      enhancedPrompt += `
Hãy sử dụng tone ${this.getToneDescription(context.tonePreference)}.`
    }

    if (context.detailLevel) {
      enhancedPrompt += `
Mức độ chi tiết: ${context.detailLevel}.`
    }

    return enhancedPrompt
  }

  /**
   * Mô tả phong cách học tập
   */
  private getLearningStyleDescription(style: string): string {
    const descriptions: { [key: string]: string } = {
      visual: 'học qua hình ảnh, biểu đồ, màu sắc',
      auditory: 'học qua âm thanh, nói chuyện, thảo luận',
      kinesthetic: 'học qua vận động, thực hành, trải nghiệm',
      reading_writing: 'học qua đọc và viết',
      mixed: 'kết hợp nhiều phương pháp'
    }
    return descriptions[style] || style
  }

  /**
   * Mô tả tone
   */
  private getToneDescription(tone: string): string {
    const descriptions: { [key: string]: string } = {
      formal: 'trang trọng, chuyên nghiệp',
      casual: 'thân thiện, gần gũi',
      friendly: 'thân thiện, nhiệt tình',
      professional: 'chuyên nghiệp, rõ ràng'
    }
    return descriptions[tone] || tone
  }

  /**
   * Xóa tất cả user preferences
   */
  async clearUserPreferences(): Promise<void> {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }
      await window.api.storage.remove(USER_PREFERENCES_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing user preferences:', error)
      throw new Error('Không thể xóa cài đặt người dùng')
    }
  }
}

// Singleton instance
export const getUserPreferencesService = (): UserPreferencesService => {
  return new UserPreferencesService()
}
