export interface UserPreferences {
  // Thông tin cá nhân
  age?: number
  interests?: string[]
  learningGoals?: string[]
  preferredTopics?: string[]

  // Phong cách học tập
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed'
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'

  // Tùy chọn prompt
  preferredLanguage?: 'vi' | 'en'
  tonePreference?: 'formal' | 'casual' | 'friendly' | 'professional'
  detailLevel?: 'brief' | 'moderate' | 'detailed'

  // Metadata
  updatedAt?: string
  createdAt?: string
}

export interface PromptEnhancementContext {
  userAge?: number
  userInterests?: string[]
  learningGoals?: string[]
  learningStyle?: string
  difficultyLevel?: string
  preferredLanguage?: string
  tonePreference?: string
  detailLevel?: string
}
