import { Account } from "../types/index.js";
import { logger } from "./logger.js";
import {
  isElectronAvailable,
  initializeElectron,
} from "./electron/electron-wrapper.js";
import { electronAuthManager } from "./electron/electron-auth.js";

export class AuthManager {
  async login(): Promise<Account> {
    logger.info("Starting authentication process", {}, "AuthManager");

    // Check if Electron is available
    if (!isElectronAvailable()) {
      throw new Error(
        "Electron not found. Please reinstall ZenCLI:\n" +
          "  npm install -g zencli\n\n" +
          "Or install Electron manually:\n" +
          "  npm install electron"
      );
    }

    try {
      // Initialize Electron
      console.log("[AuthManager] Initializing Electron...");
      await initializeElectron();

      // Use Electron auth (NO Puppeteer)
      console.log("[AuthManager] Calling electronAuthManager.login()...");
      const account = await electronAuthManager.login();

      console.log("[AuthManager] Login successful, account:", {
        id: account.id,
        name: account.name,
      });

      logger.info(
        "Authentication successful",
        { accountName: account.name },
        "AuthManager"
      );
      return account;
    } catch (error: any) {
      console.error("[AuthManager] Login error caught:", {
        message: error.message,
        stack: error.stack,
      });
      logger.error(
        "Authentication failed",
        { error: error.message, stack: error.stack },
        "AuthManager"
      );
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async logout(): Promise<void> {
    await electronAuthManager.logout();
  }
}

export const authManager = new AuthManager();
