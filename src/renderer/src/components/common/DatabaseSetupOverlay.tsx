import { useState } from 'react'
import { Database, FolderOpen, Plus } from 'lucide-react'

interface DatabaseSetupOverlayProps {
  onCreateNew: (path: string) => Promise<boolean>
  onSelectExisting: (path: string) => Promise<boolean>
}

export default function DatabaseSetupOverlay({
  onCreateNew,
  onSelectExisting
}: DatabaseSetupOverlayProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateNew = async () => {
    setIsCreating(true)
    setError(null)

    try {
      // Mở dialog để chọn vị trí lưu file mới
      const result = await window.api.fileSystem.showSaveDialog({
        title: 'Tạo Database Mới',
        defaultPath: 'stickyword.db',
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }]
      })

      if (!result.canceled && result.filePath) {
        const success = await onCreateNew(result.filePath)

        if (!success) {
          setError('Không thể tạo database. Vui lòng thử lại.')
        }
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi tạo database.')
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectExisting = async () => {
    setIsCreating(true)
    setError(null)

    try {
      // Mở dialog để chọn file có sẵn
      const result = await window.api.fileSystem.showOpenDialog({
        title: 'Chọn Database Có Sẵn',
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const success = await onSelectExisting(result.filePaths[0])

        if (!success) {
          setError('File database không hợp lệ. Vui lòng chọn file khác.')
        }
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi mở database.')
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Chào mừng đến StickyWord
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Để bắt đầu, vui lòng tạo database mới hoặc chọn database có sẵn
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleCreateNew}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tạo Database Mới
          </button>

          <button
            onClick={handleSelectExisting}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            <FolderOpen className="w-5 h-5" />
            Chọn Database Có Sẵn
          </button>
        </div>

        <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
          Database sẽ được lưu vào máy tính của bạn
        </p>
      </div>
    </div>
  )
}
