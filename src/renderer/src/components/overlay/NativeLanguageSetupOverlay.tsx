import { useState, useMemo } from 'react'
import CustomButton from '../common/CustomButton'
import CustomCombobox from '../common/CustomCombobox'
import { useDatabase } from '../../presentation/providers/database-provider'

interface LanguageOption {
  value: string
  label: string
  countryCode?: string
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'vi', label: 'Tiếng Việt', countryCode: 'VN' },
  { value: 'en', label: 'English', countryCode: 'US' },
  { value: 'ja', label: '日本語 (Japanese)', countryCode: 'JP' },
  { value: 'ko', label: '한국어 (Korean)', countryCode: 'KR' },
  { value: 'zh', label: '中文 (Chinese)', countryCode: 'CN' },
  { value: 'fr', label: 'Français (French)', countryCode: 'FR' },
  { value: 'de', label: 'Deutsch (German)', countryCode: 'DE' },
  { value: 'es', label: 'Español (Spanish)', countryCode: 'ES' },
  { value: 'pt', label: 'Português (Portuguese)', countryCode: 'PT' },
  { value: 'it', label: 'Italiano (Italian)', countryCode: 'IT' },
  { value: 'ru', label: 'Русский (Russian)', countryCode: 'RU' }
]

/**
 * Overlay hiển thị lần đầu sau khi đã connect cloud DB nhưng chưa thiết lập "ngôn ngữ mẹ".
 * Sau khi thiết lập thành công sẽ ẩn vĩnh viễn (vì giá trị bất biến trong DB).
 */
const NativeLanguageSetupOverlay = () => {
  const { isConnected, isLoading, nativeLanguage, initializeNativeLanguage } = useDatabase()
  const [selectedLanguage, setSelectedLanguage] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const languageDisplay = useMemo(
    () =>
      LANGUAGE_OPTIONS.find((l) => l.value === selectedLanguage)?.label ||
      (selectedLanguage ? selectedLanguage : ''),
    [selectedLanguage]
  )

  // Chỉ hiển thị khi:
  // - Đã kết nối cloud DB
  // - Không còn loading
  // - nativeLanguage chưa được set
  if (!isConnected || isLoading || nativeLanguage) return null

  const handleSubmit = async () => {
    if (!selectedLanguage) {
      setError('Vui lòng chọn một ngôn ngữ')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const option = LANGUAGE_OPTIONS.find((l) => l.value === selectedLanguage)
      const ok = await initializeNativeLanguage(selectedLanguage, option?.countryCode)
      if (!ok) {
        setError('Thiết lập thất bại hoặc ngôn ngữ đã được đặt trước đó.')
      } else {
        setSuccess(true)
      }
    } catch (e) {
      console.error('[NativeLanguageSetupOverlay] Error initializing native language:', e)
      setError('Đã xảy ra lỗi khi thiết lập ngôn ngữ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-card-background border border-border-default rounded-lg shadow-xl p-6 max-w-lg w-full space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">
            Thiết lập ngôn ngữ mẹ (Native Language)
          </h2>
          <p className="text-text-secondary text-sm">
            Chúng tôi sẽ dùng ngôn ngữ này cho toàn bộ phần dịch, giải thích và hướng dẫn học tiếng
            Anh. Bạn chỉ có thể đặt một lần duy nhất.
          </p>
        </div>

        <div className="space-y-4">
          <CustomCombobox
            label="Chọn ngôn ngữ mẹ"
            value={selectedLanguage}
            onChange={(val) => {
              if (Array.isArray(val)) {
                setSelectedLanguage(val[0] || '')
              } else {
                setSelectedLanguage(val)
              }
            }}
            options={LANGUAGE_OPTIONS.map((opt) => ({
              label: opt.label,
              value: opt.value
            }))}
            placeholder="Chọn ngôn ngữ..."
            size="sm"
          />

          {selectedLanguage && (
            <div className="text-xs text-text-secondary">
              Ngôn ngữ chọn:{' '}
              <span className="font-medium text-text-primary">{languageDisplay}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-600 dark:text-green-400">
              Thành công! Ngôn ngữ mẹ đã được thiết lập và không thể thay đổi.
            </div>
          )}

          <CustomButton
            variant="primary"
            size="sm"
            disabled={!selectedLanguage || isSubmitting || success}
            onClick={handleSubmit}
            className="w-full"
          >
            {isSubmitting ? 'Đang thiết lập...' : 'Xác nhận ngôn ngữ'}
          </CustomButton>

          <div className="text-[11px] leading-relaxed text-text-secondary">
            <p>
              Sau khi xác nhận, mọi prompt AI sẽ yêu cầu dịch & giải thích sang ngôn ngữ mẹ này.
            </p>
            <p className="mt-2">
              Quy tắc bất biến: Nếu bạn cần thay đổi, hãy tạo database cloud mới hoặc liên hệ hỗ
              trợ.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NativeLanguageSetupOverlay
