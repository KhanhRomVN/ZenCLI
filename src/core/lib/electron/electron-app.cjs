#!/usr/bin/env node
// Electron main process for authentication and API calls
const { app, BrowserWindow, session, ipcMain, net } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Disable hardware acceleration
app.disableHardwareAcceleration();
app.setName("ZenCLI");

// Prevent quit when all windows closed (keep process running)
app.on("window-all-closed", () => {
  // Don't quit - keep running for API calls
});

const BASE_URL = "https://claude.ai";
const TIMEOUT = 300000; // 5 minutes
const STORE_PATH = path.join(
  os.homedir(),
  ".config",
  "zencli",
  "electron-store.json"
);

// Track if IPC handlers are already registered
let handlersRegistered = false;

// ============================================
// STORAGE FUNCTIONS
// ============================================

function ensureStoreDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getStore() {
  ensureStoreDir();
  if (fs.existsSync(STORE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    } catch {
      return { accounts: [], deviceId: null, anonymousId: null };
    }
  }
  return { accounts: [], deviceId: null, anonymousId: null };
}

function saveStore(store) {
  ensureStoreDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function generateId() {
  return require("crypto").randomUUID();
}

function getDeviceId() {
  const store = getStore();
  if (!store.deviceId) {
    store.deviceId = generateId();
    saveStore(store);
  }
  return store.deviceId;
}

function getAnonymousId() {
  const store = getStore();
  if (!store.anonymousId) {
    store.anonymousId = `claudeai.v1.${generateId()}`;
    saveStore(store);
  }
  return store.anonymousId;
}

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

async function saveAccount(orgId, name, email) {
  const cookies = await session.defaultSession.cookies.get({
    domain: ".claude.ai",
  });
  const sessionKey = cookies.find((c) => c.name === "sessionKey")?.value;

  if (!sessionKey) {
    throw new Error("No session key found");
  }

  const store = getStore();
  const accounts = store.accounts || [];
  const existingIndex = accounts.findIndex((acc) => acc.orgId === orgId);

  const accountInfo = {
    id: orgId,
    orgId,
    sessionKey,
    name,
    email,
    addedAt: existingIndex >= 0 ? accounts[existingIndex].addedAt : Date.now(),
    lastUsed: Date.now(),
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = accountInfo;
  } else {
    accounts.push(accountInfo);
  }

  store.accounts = accounts;
  store.activeAccountId = orgId;
  saveStore(store);

  return accountInfo;
}

async function getAccounts() {
  const store = getStore();
  return store.accounts || [];
}

async function getActiveAccount() {
  const store = getStore();
  const activeId = store.activeAccountId;
  if (!activeId) return null;

  const accounts = await getAccounts();
  return accounts.find((acc) => acc.id === activeId) || null;
}

async function switchAccount(accountId) {
  const accounts = await getAccounts();
  const account = accounts.find((acc) => acc.id === accountId);

  if (!account) {
    return { success: false, error: "Account not found" };
  }

  try {
    // Clear current session cookies
    await session.defaultSession.cookies.remove(
      "https://claude.ai",
      "sessionKey"
    );
    await session.defaultSession.cookies.remove(
      "https://claude.ai",
      "lastActiveOrg"
    );

    // Set new account's cookies
    await session.defaultSession.cookies.set({
      url: "https://claude.ai",
      name: "sessionKey",
      value: account.sessionKey,
      domain: ".claude.ai",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });

    await session.defaultSession.cookies.set({
      url: "https://claude.ai",
      name: "lastActiveOrg",
      value: account.orgId,
      domain: ".claude.ai",
      path: "/",
      secure: true,
      httpOnly: false,
      sameSite: "lax",
    });

    // Update active account and last used timestamp
    const store = getStore();
    store.accounts = store.accounts.map((acc) =>
      acc.id === accountId ? { ...acc, lastUsed: Date.now() } : acc
    );
    store.activeAccountId = accountId;
    saveStore(store);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// AUTHENTICATION
// ============================================

async function performLogin() {
  const loginPartition = "login-temp";

  // Clear previous session
  try {
    await session.fromPartition(loginPartition).clearStorageData();
  } catch (error) {
    // Ignore
  }

  const authWindow = new BrowserWindow({
    width: 500,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: loginPartition,
    },
    title: "Sign in to Claude",
    show: true,
    center: true,
    resizable: false,
  });

  authWindow.loadURL(`${BASE_URL}/login`);

  return new Promise((resolve, reject) => {
    let resolved = false;

    const checkInterval = setInterval(async () => {
      if (resolved || authWindow.isDestroyed()) {
        clearInterval(checkInterval);
        return;
      }

      const loginSession = session.fromPartition(loginPartition);
      const cookies = await loginSession.cookies.get({ domain: ".claude.ai" });

      const sessionKey = cookies.find((c) => c.name === "sessionKey")?.value;
      const orgId = cookies.find((c) => c.name === "lastActiveOrg")?.value;

      if (sessionKey && orgId) {
        resolved = true;
        clearInterval(checkInterval);
        clearTimeout(timeoutHandle);

        // Copy cookies to default session
        try {
          for (const cookie of cookies) {
            const domain = cookie.domain.startsWith(".")
              ? cookie.domain.substring(1)
              : cookie.domain;

            await session.defaultSession.cookies.set({
              url: `https://${domain}${cookie.path}`,
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path,
              secure: cookie.secure,
              httpOnly: cookie.httpOnly,
              expirationDate: cookie.expirationDate,
            });
          }
        } catch (error) {
          if (!authWindow.isDestroyed()) {
            authWindow.close();
          }
          reject(new Error(`Failed to copy cookies: ${error.message}`));
          return;
        }

        // Get user info
        let username = "Claude User";
        let userEmail = "";

        try {
          const response = await makeRequest(`${BASE_URL}/api/auth/session`);
          if (response.status === 200 && response.data) {
            const data = response.data;
            const account = data.account || {};
            const name = account.name;
            const email = account.email_address || data.email;

            if (name) username = name;
            if (email) userEmail = email;

            if (
              (username === "Claude User" || username === "Unknown") &&
              email
            ) {
              username = email;
            }
          }
        } catch (error) {
          // Use default
        }

        // Fallback: get from organization if still default
        if (username === "Claude User" || username === "Unknown") {
          try {
            const response = await makeRequest(
              `${BASE_URL}/api/organizations/${orgId}`
            );
            const orgData = response.data || {};
            let orgName = orgData.display_name || orgData.name || "Unknown";

            const genericPattern = /^(.*)'s Organization$/i;
            const match = orgName.match(genericPattern);
            if (match && match[1] && match[1].includes("@")) {
              if (!userEmail) userEmail = match[1];
              const outputName = match[1].split("@")[0];
              username = outputName;
            } else {
              username = orgName;
            }
          } catch (error) {
            // Keep default
          }
        }

        // Save account
        try {
          const accountInfo = await saveAccount(orgId, username, userEmail);

          const successResult = {
            success: true,
            username: accountInfo.name,
            userEmail: accountInfo.email,
            sessionKey: accountInfo.sessionKey,
            orgId: accountInfo.orgId,
            cookieString: `sessionKey=${accountInfo.sessionKey}; lastActiveOrg=${accountInfo.orgId}`,
          };

          if (!authWindow.isDestroyed()) {
            authWindow.close();
          }
          resolve(successResult);
        } catch (error) {
          if (!authWindow.isDestroyed()) {
            authWindow.close();
          }
          reject(new Error(`Failed to save account: ${error.message}`));
        }
      }
    }, 1000);

    // Timeout
    const timeoutHandle = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(checkInterval);
        if (!authWindow.isDestroyed()) {
          authWindow.close();
        }
        reject(new Error("Authentication timeout"));
      }
    }, TIMEOUT);

    // Handle window close
    authWindow.on("closed", () => {
      if (!resolved) {
        resolved = true;
        clearInterval(checkInterval);
        clearTimeout(timeoutHandle);
        reject(new Error("Window closed by user"));
      }
    });
  });
}

// ============================================
// API REQUEST HELPER
// ============================================

async function setCommonHeaders(request, method) {
  request.setHeader("accept", "application/json, text/event-stream");
  request.setHeader("accept-language", "en-US,en;q=0.9");

  if (method.toUpperCase() !== "GET") {
    request.setHeader("content-type", "application/json");
  }

  request.setHeader("origin", BASE_URL);
  request.setHeader("referer", BASE_URL);
  request.setHeader("anthropic-client-platform", "web_claude_ai");
  request.setHeader("anthropic-client-version", "1.0.0");
  request.setHeader("anthropic-device-id", getDeviceId());
  request.setHeader("anthropic-anonymous-id", getAnonymousId());
  request.setHeader(
    "user-agent",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
}

function makeRequest(url, method = "GET", body = null) {
  return new Promise(async (resolve, reject) => {
    const request = net.request({
      url,
      method,
      useSessionCookies: true,
    });

    await setCommonHeaders(request, method);

    let responseData = "";
    let statusCode = 0;

    request.on("response", (response) => {
      statusCode = response.statusCode;

      response.on("data", (chunk) => {
        responseData += chunk.toString();
      });

      response.on("end", () => {
        try {
          const data = responseData ? JSON.parse(responseData) : null;
          resolve({ status: statusCode, data });
        } catch {
          resolve({ status: statusCode, data: responseData });
        }
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    if (body) {
      request.write(JSON.stringify(body));
    }
    request.end();
  });
}

// ============================================
// IPC HANDLERS
// ============================================

function setupIpcHandlers() {
  // Check if handlers already registered
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;

  // Login
  ipcMain.handle("auth:login", async () => {
    try {
      const result = await performLogin();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get accounts
  ipcMain.handle("account:get-all", async () => {
    try {
      const accounts = await getAccounts();
      return { success: true, accounts };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get active account
  ipcMain.handle("account:get-active", async () => {
    try {
      const account = await getActiveAccount();
      return { success: true, account };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Switch account
  ipcMain.handle("account:switch", async (event, accountId) => {
    return await switchAccount(accountId);
  });

  // Remove account
  ipcMain.handle("account:remove", async (event, accountId) => {
    try {
      const store = getStore();
      const accounts = store.accounts || [];
      const filtered = accounts.filter((acc) => acc.id !== accountId);

      if (filtered.length === accounts.length) {
        return { success: false, error: "Account not found" };
      }

      store.accounts = filtered;

      // If removed active account, switch to another
      if (store.activeAccountId === accountId) {
        if (filtered.length > 0) {
          await switchAccount(filtered[0].id);
        } else {
          await session.defaultSession.clearStorageData({
            storages: ["cookies"],
          });
          store.activeAccountId = null;
        }
      }

      saveStore(store);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create conversation
  ipcMain.handle("conversation:create", async (event, model) => {
    try {
      const account = await getActiveAccount();
      if (!account) {
        return { success: false, error: "No active account" };
      }

      const conversationId = generateId();
      const result = await makeRequest(
        `${BASE_URL}/api/organizations/${account.orgId}/chat_conversations`,
        "POST",
        {
          uuid: conversationId,
          name: "",
          model: model || "claude-sonnet-4-5-20250929",
        }
      );

      return {
        success: true,
        conversationId,
        parentMessageUuid: result.data?.uuid || conversationId,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Send message (streaming)
  ipcMain.handle(
    "message:send",
    async (event, { conversationId, parentMessageUuid, prompt }) => {
      try {
        const account = await getActiveAccount();
        if (!account) {
          return { success: false, error: "No active account" };
        }

        const url = `${BASE_URL}/api/organizations/${account.orgId}/chat_conversations/${conversationId}/completion`;

        const body = {
          prompt,
          parent_message_uuid:
            parentMessageUuid === conversationId ? null : parentMessageUuid,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          personalized_styles: [
            {
              type: "default",
              key: "Default",
              name: "Normal",
              nameKey: "normal_style_name",
              prompt: "Normal",
              summary: "Default responses from Claude",
              summaryKey: "normal_style_summary",
              isDefault: true,
            },
          ],
          locale: "en-US",
          tools: [
            { type: "web_search_v0", name: "web_search" },
            { type: "artifacts_v0", name: "artifacts" },
            { type: "repl_v0", name: "repl" },
          ],
          attachments: [],
          files: [],
          sync_sources: [],
          rendering_mode: "messages",
        };

        return new Promise(async (resolve, reject) => {
          const request = net.request({
            url,
            method: "POST",
            useSessionCookies: true,
          });

          await setCommonHeaders(request, "POST");

          request.on("response", (response) => {
            if (response.statusCode !== 200) {
              let errorData = "";
              response.on("data", (chunk) => {
                errorData += chunk.toString();
              });
              response.on("end", () => {
                reject(
                  new Error(
                    `Request failed: ${response.statusCode} - ${errorData}`
                  )
                );
              });
              return;
            }

            let buffer = "";
            let messageUuid = "";

            response.on("data", (chunk) => {
              buffer += chunk.toString();
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.substring(6));
                    if (data.text) {
                      event.sender.send("message:stream-chunk", {
                        text: data.text,
                      });
                    }
                    if (data.messageUuid) {
                      messageUuid = data.messageUuid;
                    }
                  } catch (error) {
                    // Ignore parse errors
                  }
                }
              }
            });

            response.on("end", () => {
              event.sender.send("message:stream-complete", { messageUuid });
              resolve({ success: true, messageUuid });
            });
          });

          request.on("error", (error) => {
            reject(error);
          });

          request.write(JSON.stringify(body));
          request.end();
        });
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  // Get conversations
  ipcMain.handle("conversation:get-all", async () => {
    try {
      const account = await getActiveAccount();
      if (!account) {
        return { success: false, error: "No active account" };
      }

      const result = await makeRequest(
        `${BASE_URL}/api/organizations/${account.orgId}/chat_conversations`
      );
      return { success: true, conversations: result.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get available models
  ipcMain.handle("models:get-all", async () => {
    try {
      const account = await getActiveAccount();
      if (!account) {
        return { success: false, error: "No active account" };
      }

      const result = await makeRequest(
        `${BASE_URL}/api/organizations/${account.orgId}/models`
      );
      return { success: true, models: result.data };
    } catch (error) {
      // Return default models if API fails
      return {
        success: true,
        models: [
          { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
          { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
          { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
          { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
        ],
      };
    }
  });
}

// ============================================
// MAIN PROCESS
// ============================================

async function startElectronBridge() {
  await app.whenReady();

  setupIpcHandlers();

  // Restore active account's cookies on startup
  const activeAccount = await getActiveAccount();
  if (activeAccount) {
    await switchAccount(activeAccount.id);
  }

  // ✅ OUTPUT READY SIGNAL
  console.error("Electron bridge ready");

  // Check if --login argument is passed
  const args = process.argv.slice(2);
  if (args.includes("--login")) {
    try {
      const result = await performLogin();
      console.log(JSON.stringify(result));
      process.exit(0);
    } catch (error) {
      console.log(JSON.stringify({ success: false, error: error.message }));
      process.exit(1);
    }
  }
}

// Only call once
startElectronBridge().catch((error) => {
  console.log(JSON.stringify({ success: false, error: error.message })); // ← OUTPUT error
  process.exit(1);
});
