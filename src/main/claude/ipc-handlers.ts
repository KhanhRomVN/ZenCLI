import { ipcMain, BrowserWindow, session } from 'electron'
import {
  isAuthenticated,
  getOrgId,
  saveAccount,
  getAccounts,
  switchAccount,
  getActiveAccount,
  removeAccount,
  makeRequest,
  streamCompletion,
  stopResponse,
  prepareAttachmentPayload,
  BASE_URL
} from './api-client'
import {
  createStreamState,
  processSSEChunk,
  StreamCallbacks
} from '../../renderer/src/services/claude/stream-parser'
import crypto from 'crypto'

const BASE_CLAUDE_URL = BASE_URL

export function setupClaudeHandlers() {
  // Check authentication status
  ipcMain.handle('claude:get-auth-status', async () => {
    return await isAuthenticated()
  })

  // Login handler - opens Claude login window
  ipcMain.handle('claude:login', async () => {
    try {
      // Clear session cookies explicitly to allow fresh login
      await session.defaultSession.cookies.remove('https://claude.ai', 'sessionKey')
      await session.defaultSession.cookies.remove('https://claude.ai', 'lastActiveOrg')
    } catch (error) {
      console.error('[Claude Login] Failed to clear cookies:', error)
    }

    const authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      title: 'Sign in to Claude'
    })

    authWindow.loadURL(`${BASE_CLAUDE_URL}/login`)

    // Check for successful authentication
    const checkCookies = async (): Promise<{ success: boolean; error?: string } | null> => {
      const cookies = await session.defaultSession.cookies.get({
        domain: '.claude.ai'
      })
      const sessionKey = cookies.find((c) => c.name === 'sessionKey')?.value
      const orgId = cookies.find((c) => c.name === 'lastActiveOrg')?.value

      if (sessionKey && orgId) {
        try {
          // Fetch user info
          const response = await makeRequest(`${BASE_CLAUDE_URL}/api/organizations/${orgId}`)
          const orgData = response.data as any
          await saveAccount(orgId, orgData?.name || 'Unknown', orgData?.display_name)
          authWindow.close()
          return { success: true }
        } catch (error) {
          return { success: false, error: String(error) }
        }
      }
      return null
    }

    return new Promise((resolve) => {
      authWindow.webContents.on('did-finish-load', async () => {
        const result = await checkCookies()
        if (result) resolve(result)
      })

      const interval = setInterval(async () => {
        const result = await checkCookies()
        if (result) {
          clearInterval(interval)
          resolve(result)
        }
      }, 1000)

      authWindow.on('closed', () => {
        clearInterval(interval)
        resolve({ success: false, error: 'Window closed by user' })
      })
    })
  })

  // Get all accounts
  ipcMain.handle('claude:get-accounts', async () => {
    try {
      const accounts = getAccounts()
      return { success: true, accounts }
    } catch (error) {
      console.error('[Claude] Failed to get accounts:', error)
      return { success: false, error: String(error) }
    }
  })

  // Switch account
  ipcMain.handle('claude:switch-account', async (_event, accountId: string) => {
    try {
      const success = await switchAccount(accountId)
      return { success }
    } catch (error) {
      console.error('[Claude] Failed to switch account:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get active account
  ipcMain.handle('claude:get-active-account', async () => {
    try {
      const account = await getActiveAccount()
      return { success: true, account }
    } catch (error) {
      console.error('[Claude] Failed to get active account:', error)
      return { success: false, error: String(error) }
    }
  })

  // Remove account
  ipcMain.handle('claude:remove-account', async (_event, accountId: string) => {
    try {
      const success = await removeAccount(accountId)
      return { success }
    } catch (error) {
      console.error('[Claude] Failed to remove account:', error)
      return { success: false, error: String(error) }
    }
  })

  // Create conversation
  ipcMain.handle('claude:create-conversation', async (_event, model?: string) => {
    const orgId = await getOrgId()
    if (!orgId) throw new Error('Not authenticated')

    const conversationId = crypto.randomUUID()
    const result = await makeRequest(
      `${BASE_CLAUDE_URL}/api/organizations/${orgId}/chat_conversations`,
      'POST',
      {
        uuid: conversationId,
        name: '',
        model: model || 'claude-sonnet-4-5-20250929'
      }
    )

    const data = result.data as { uuid?: string }
    return {
      conversationId,
      parentMessageUuid: data.uuid || conversationId,
      ...(result.data as object)
    }
  })

  // Send message with streaming
  ipcMain.handle(
    'claude:send-message',
    async (
      event,
      {
        conversationId,
        parentMessageUuid,
        message,
        attachments
      }: {
        conversationId: string
        parentMessageUuid: string
        message: string
        attachments?: any[]
      }
    ) => {
      const orgId = await getOrgId()
      if (!orgId) throw new Error('Not authenticated')

      const state = createStreamState()
      const senderWindow = BrowserWindow.fromWebContents(event.sender)

      const callbacks: StreamCallbacks = {
        onTextDelta: (text, fullText) => {
          senderWindow?.webContents.send('claude:stream-chunk', {
            text: fullText,
            steps: []
          })
        },
        onComplete: (fullText, steps, messageUuid) => {
          state.lastMessageUuid = messageUuid
          senderWindow?.webContents.send('claude:stream-chunk', {
            text: fullText,
            steps,
            complete: true
          })
        }
      }

      await streamCompletion(
        orgId,
        conversationId,
        message,
        parentMessageUuid,
        (chunk) => {
          processSSEChunk(chunk, state, callbacks)
        },
        { attachments: attachments || [] }
      )

      return {
        success: true,
        messageUuid: state.lastMessageUuid
      }
    }
  )

  // Stop streaming response
  ipcMain.handle('claude:stop-response', async (_event, conversationId: string) => {
    const orgId = await getOrgId()
    if (!orgId) throw new Error('Not authenticated')

    await stopResponse(orgId, conversationId)
    return { success: true }
  })

  // Upload file
  ipcMain.handle(
    'claude:upload-file',
    async (
      _event,
      { name, size, type, data }: { name: string; size: number; type: string; data: ArrayBuffer }
    ) => {
      const attachment = await prepareAttachmentPayload({
        name,
        size,
        type,
        data
      })
      return { success: true, attachment }
    }
  )

  // Get conversations list
  ipcMain.handle('claude:get-conversations', async () => {
    const orgId = await getOrgId()
    if (!orgId) throw new Error('Not authenticated')

    const result = await makeRequest(
      `${BASE_CLAUDE_URL}/api/organizations/${orgId}/chat_conversations`
    )
    return { success: true, conversations: result.data }
  })

  console.log('[Claude] IPC handlers registered')
}
