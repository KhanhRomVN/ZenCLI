import { RouterProvider, createHashRouter } from 'react-router-dom'
import { routes } from './presentation/routes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './presentation/providers/theme-provider'
import { DatabaseProvider } from './presentation/providers/database-provider'
import DatabaseConnectionOverlay from './components/common/DatabaseConnectionOverlay'
import NativeLanguageSetupOverlay from './components/overlay/NativeLanguageSetupOverlay'
import { useEffect } from 'react'
import {
  getAutoSessionService,
  destroyAutoSessionService,
  AutoSessionConfig
} from './services/AutoSessionService'

function App() {
  const router = createHashRouter(routes)
  const queryClient = new QueryClient()

  useEffect(() => {
    const loadAndStartService = async () => {
      try {
        if (!window.api) {
          console.error('[App] ❌ window.api is not available')
          return
        }

        const config: AutoSessionConfig = await window.api.storage.get('auto_session_config')
        if (!config) {
          return
        }

        if (!config.enabled) {
          return
        }

        const service = getAutoSessionService(config, (session) => {
          window.dispatchEvent(
            new CustomEvent('new-session-created', {
              detail: { session }
            })
          )
        })

        service.start()
      } catch (error) {
        console.error('[App] ❌ Failed to start AutoSessionService:', error)
      }
    }

    loadAndStartService()

    // ✅ Listen cho message từ popup window
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'session-updated') {
        window.dispatchEvent(new CustomEvent('session-updated'))
      }
    }

    const handleNavigateToSession = (_event: any, sessionId: string) => {
      router.navigate(`/session?sessionId=${sessionId}`)
    }

    window.addEventListener('message', handleMessage)

    const ipc = (window as any).electron?.ipcRenderer
    if (ipc) {
      ipc.on('navigate-to-session', handleNavigateToSession)
    }

    return () => {
      destroyAutoSessionService()
      window.removeEventListener('message', handleMessage)
      const ipc = (window as any).electron?.ipcRenderer
      if (ipc) {
        ipc.removeListener('navigate-to-session', handleNavigateToSession)
      }
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="stickyword-theme">
        <DatabaseProvider>
          <DatabaseConnectionOverlay />
          <NativeLanguageSetupOverlay />
          <RouterProvider router={router} />
        </DatabaseProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
