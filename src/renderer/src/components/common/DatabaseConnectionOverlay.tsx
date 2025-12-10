import { useState } from 'react'
import { useDatabase } from '../../presentation/providers/database-provider'
import CustomInput from './CustomInput'
import CustomButton from './CustomButton'

const DatabaseConnectionOverlay = () => {
  const { isConnected, isLoading, error, connect } = useDatabase()
  const [connectionString, setConnectionString] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    if (!connectionString.trim()) return

    setIsConnecting(true)
    await connect(connectionString)
    setIsConnecting(false)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-primary">Đang kiểm tra kết nối...</p>
        </div>
      </div>
    )
  }

  if (isConnected) return null

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card-background border border-border-default rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Kết nối Database</h2>
        <p className="text-text-secondary mb-6">Vui lòng nhập connection string để kết nối</p>

        <div className="space-y-4">
          <CustomInput
            type="password"
            label="Connection String"
            value={connectionString}
            onChange={setConnectionString}
            placeholder="postgresql://user:pass@host:port/dbname"
            variant="default"
            size="sm"
          />

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <CustomButton
            variant="primary"
            size="sm"
            onClick={handleConnect}
            disabled={!connectionString.trim() || isConnecting}
            className="w-full"
          >
            {isConnecting ? 'Đang kết nối...' : 'Kết nối'}
          </CustomButton>
        </div>
      </div>
    </div>
  )
}

export default DatabaseConnectionOverlay
