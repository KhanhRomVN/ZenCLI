import { Account } from "../../types/index.js";
import { storage } from "../storage.js";
import { utils } from "../utils.js";
import { logger } from "../logger.js";
import { spawnElectronAuth } from "./electron-wrapper.js";

export class ElectronAuthManager {
  async login(): Promise<Account> {
    logger.info("Starting Electron authentication", {}, "ElectronAuth");

    console.log("[ElectronAuth] Calling spawnElectronAuth()...");

    let result;
    try {
      result = await spawnElectronAuth();
      console.log("[ElectronAuth] spawnElectronAuth() returned:", result);
    } catch (error: any) {
      console.error("[ElectronAuth] spawnElectronAuth() error:", {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }

    if (!result.success || !result.sessionKey || !result.orgId) {
      console.error("[ElectronAuth] Invalid result:", result);
      throw new Error(result.error || "Authentication failed");
    }

    logger.info(
      "Authentication successful",
      { orgId: result.orgId.slice(0, 8) + "..." },
      "ElectronAuth"
    );

    const account: Account = {
      id: utils.generateId(),
      name: result.username || "Claude User",
      email: result.userEmail || "",
      orgId: result.orgId,
      sessionKey: result.sessionKey,
      cookieString:
        result.cookieString ||
        `sessionKey=${result.sessionKey}; lastActiveOrg=${result.orgId}`,
      addedAt: Date.now(),
      lastUsed: Date.now(),
      username: result.username || "Claude User",
      dailyReqCount: 0,
      lastReqDate: new Date().toISOString().split("T")[0],
      inputTokens: 0,
      outputTokens: 0,
    };

    console.log("[ElectronAuth] Created account object:", {
      id: account.id,
      name: account.name,
    });

    storage.addAccount(account);
    console.log("[ElectronAuth] Account saved to storage");
    logger.info("Account saved", { accountId: account.id }, "ElectronAuth");

    console.log("[ElectronAuth] Returning account");
    return account;
  }

  async logout(): Promise<void> {
    logger.info("Logging out", {}, "ElectronAuth");
    storage.clear();
  }
}

export const electronAuthManager = new ElectronAuthManager();
