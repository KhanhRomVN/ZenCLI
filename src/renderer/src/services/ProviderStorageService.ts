import { ProviderType } from '../types/provider'

export interface ProviderConfig {
  id: string
  type: ProviderType
  apiKey?: string
  baseUrl?: string
  modelId?: string
  isActive: boolean
  createdAt: string
}

const PROVIDER_STORAGE_KEY = 'app_providers'

export class ProviderStorageService {
  /**
   * Lưu providers vào storage
   */
  async saveProviders(providers: ProviderConfig[]): Promise<void> {
    if (!window.api) throw new Error('Electron API not available')

    try {
      await window.api.storage.set(PROVIDER_STORAGE_KEY, providers)
    } catch (error) {
      console.error('[ProviderStorageService] ❌ Error saving providers:', error)
      throw error
    }
  }

  /**
   * Lấy tất cả providers từ storage
   */
  async getAllProviders(): Promise<ProviderConfig[]> {
    if (!window.api) throw new Error('Electron API not available')

    try {
      const providers = await window.api.storage.get(PROVIDER_STORAGE_KEY)
      return Array.isArray(providers) ? providers : []
    } catch (error) {
      console.error('[ProviderStorageService] ❌ Error getting providers:', error)
      return []
    }
  }

  /**
   * Thêm provider mới
   */
  async addProvider(provider: ProviderConfig): Promise<void> {
    const providers = await this.getAllProviders()
    providers.push(provider)
    await this.saveProviders(providers)
  }

  /**
   * Cập nhật provider
   */
  async updateProvider(providerId: string, updates: Partial<ProviderConfig>): Promise<void> {
    const providers = await this.getAllProviders()
    const index = providers.findIndex((p) => p.id === providerId)

    if (index === -1) {
      throw new Error(`Provider not found: ${providerId}`)
    }

    providers[index] = { ...providers[index], ...updates }
    await this.saveProviders(providers)
  }

  /**
   * Xóa provider
   */
  async deleteProvider(providerId: string): Promise<void> {
    const providers = await this.getAllProviders()
    const filteredProviders = providers.filter((p) => p.id !== providerId)
    await this.saveProviders(filteredProviders)
  }

  /**
   * Đặt một provider thành active và các provider khác thành inactive
   */
  async setActiveProvider(providerId: string): Promise<void> {
    const providers = await this.getAllProviders()
    const updatedProviders = providers.map((p) => ({
      ...p,
      isActive: p.id === providerId
    }))
    await this.saveProviders(updatedProviders)
  }

  /**
   * Lấy provider đang active
   */
  async getActiveProvider(): Promise<ProviderConfig | null> {
    const providers = await this.getAllProviders()
    return providers.find((p) => p.isActive) || null
  }
}

// Singleton instance
let providerStorageInstance: ProviderStorageService | null = null

export const getProviderStorageService = (): ProviderStorageService => {
  if (!providerStorageInstance) {
    providerStorageInstance = new ProviderStorageService()
  }
  return providerStorageInstance
}
