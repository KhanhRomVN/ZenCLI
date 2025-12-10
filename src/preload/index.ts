import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Export API type for TypeScript
export interface API {}

// Custom APIs for renderer
const api: API = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      ipcRenderer: {
        on: (channel: string, listener: (...args: any[]) => void) => {
          ipcRenderer.on(channel, listener)
        },
        removeListener: (channel: string, listener: (...args: any[]) => void) => {
          ipcRenderer.removeListener(channel, listener)
        },
        send: (channel: string, ...args: any[]) => {
          ipcRenderer.send(channel, ...args)
        },
        invoke: (channel: string, ...args: any[]) => {
          return ipcRenderer.invoke(channel, ...args)
        }
      }
    })
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('electronAPI', api) // For compatibility
  } catch (error) {
    console.error(error)
  }
} else {
  // TypeScript now knows these properties exist on Window
  ;(window as any).electron = {
    ...electronAPI,
    ipcRenderer: {
      on: ipcRenderer.on.bind(ipcRenderer),
      removeListener: ipcRenderer.removeListener.bind(ipcRenderer),
      send: ipcRenderer.send.bind(ipcRenderer),
      invoke: ipcRenderer.invoke.bind(ipcRenderer)
    }
  }
  ;(window as any).api = api
  ;(window as any).electronAPI = api
}
