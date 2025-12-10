import { ElectronAPI } from '@electron-toolkit/preload'

// Define the API interface
interface API {}

// Extend the Window interface to include our APIs
declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        on: (channel: string, listener: (...args: any[]) => void) => void
        removeListener: (channel: string, listener: (...args: any[]) => void) => void
        send: (channel: string, ...args: any[]) => void
        invoke: (channel: string, ...args: any[]) => Promise<any>
      }
    }
    api: API
    electronAPI: API
  }
}
