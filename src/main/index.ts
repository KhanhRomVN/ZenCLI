import * as dotenv from 'dotenv'
dotenv.config()
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import * as path from 'path'
import { Pool } from 'pg'
import { setupClaudeHandlers } from './claude/ipc-handlers'

let mainWindow: BrowserWindow | null = null
let cloudDbPool: Pool | null = null
let isCloudDbConnected: boolean = false

// Storage file path
const getStorageFilePath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'email-manager-config.json')
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])

    // Enable auto-reload in development
    mainWindow.webContents.on('did-fail-load', () => {
      if (mainWindow) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
      }
    })

    if (is.dev && mainWindow) {
      mainWindow.webContents.on('did-finish-load', () => {
        if (mainWindow) {
          mainWindow.blur()
          mainWindow.webContents.openDevTools({ mode: 'detach' })
        }
      })
    }
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Setup IPC handlers for storage operations
function setupStorageHandlers() {
  // Set storage value
  ipcMain.handle('storage:set', async (_event, key: string, value: any) => {
    try {
      const storagePath = getStorageFilePath()
      let data: Record<string, any> = {}

      // Read existing data if file exists
      if (fs.existsSync(storagePath)) {
        const fileContent = fs.readFileSync(storagePath, 'utf8')
        try {
          data = JSON.parse(fileContent)
        } catch (parseError) {
          console.warn('Failed to parse storage file, creating new one')
          data = {}
        }
      }

      // Update data
      data[key] = value

      // Write back to file
      fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf8')
    } catch (error) {
      console.error('Error setting storage value:', error)
      throw error
    }
  })

  // Get storage value
  ipcMain.handle('storage:get', async (_event, key: string) => {
    try {
      const storagePath = getStorageFilePath()

      if (!fs.existsSync(storagePath)) {
        return null
      }

      const fileContent = fs.readFileSync(storagePath, 'utf8')

      // ✅ Kiểm tra file rỗng hoặc invalid
      if (!fileContent || fileContent.trim().length === 0) {
        console.warn(`[storage:get] Empty file for key: ${key}`)
        return null
      }

      try {
        const data = JSON.parse(fileContent)
        const result = data[key] || null
        return result
      } catch (parseError) {
        console.error(`[storage:get] Failed to parse storage file for key: ${key}`, parseError)
        return null
      }
    } catch (error) {
      console.error(`[storage:get] Error getting storage value for key: ${key}`, error)
      return null
    }
  })

  // Remove storage value
  ipcMain.handle('storage:remove', async (_event, key: string) => {
    try {
      const storagePath = getStorageFilePath()

      if (!fs.existsSync(storagePath)) {
        return
      }

      const fileContent = fs.readFileSync(storagePath, 'utf8')
      try {
        const data = JSON.parse(fileContent)
        delete data[key]
        fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf8')
      } catch (parseError) {
        console.warn('Failed to parse storage file')
      }
    } catch (error) {
      console.error('Error removing storage value:', error)
      throw error
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Setup IPC handlers
  setupStorageHandlers()
  setupClaudeHandlers()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // Hot reload in development
  if (is.dev) {
    app.on('activate', () => {
      if (mainWindow === null) createWindow()
    })

    if (mainWindow) {
      mainWindow.webContents.on('destroyed', () => {
        mainWindow = null
      })
    }
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    if (cloudDbPool) {
      try {
        await cloudDbPool.end()
        isCloudDbConnected = false
      } catch (err) {
        console.error('[app quit] ❌ Error closing database:', err)
      }
    }
    app.quit()
  }
})
