import { Request, Response } from "express";
import { storage } from "../../../core/lib/storage.js";
import { logger } from "../../../core/lib/logger.js";
import { authManager } from "../../../core/lib/auth-manager.js";
import { AccountsResponse, ErrorResponse } from "../../types/index.js";

export class AccountController {
  static async getAll(req: Request, res: Response) {
    try {
      const accounts = storage.getAccounts();
      const activeAccount = storage.getActiveAccount();

      // Calculate daily counts (this logic could be moved to storage/service later)
      const today = new Date().toISOString().split("T")[0];

      const response: AccountsResponse = {
        success: true,
        accounts: accounts.map((acc) => {
          // Reset count if new day
          if (acc.lastReqDate !== today) {
            // In a real app we'd update storage here, but for now we just return reset values
            // or rely on the fact that we should update storage when usage happens.
            // Let's assume storage is updated on usage.
          }

          return {
            id: acc.id,
            email: acc.email,
            username: acc.username || acc.name, // Fallback
            isActive: activeAccount?.id === acc.id,
            reqCount: acc.lastReqDate === today ? acc.dailyReqCount || 0 : 0,
            inputTokens: acc.inputTokens || 0,
            outputTokens: acc.outputTokens || 0,
            conversationId: acc.conversationId || null,
          };
        }),
      };

      logger.debug(
        "Accounts retrieved",
        { count: accounts.length },
        "AccountController"
      );
      res.json(response);
    } catch (error: any) {
      logger.error(
        "Get accounts failed",
        { error: error.message },
        "AccountController"
      );

      const response: ErrorResponse = {
        success: false,
        error: error.message,
      };

      res.status(500).json(response);
    }
  }

  static async addAccount(req: Request, res: Response) {
    try {
      logger.info("Add account request received", {}, "AccountController");

      // Uses existing authManager to trigger login flow (electron-browser)
      const account = await authManager.login();

      // Here we might want to ensure the account has new fields initialized
      // The authManager.login() currently returns the account from storage.
      // We should make sure storage initializes new fields.
      // Assuming storage update is separate or handled within authManager.

      logger.info(
        "Account added successfully",
        { accountId: account.id },
        "AccountController"
      );

      res.json({
        success: true,
        account: {
          id: account.id,
          username: account.name,
          email: account.email,
        },
      });
    } catch (error: any) {
      logger.error(
        "Add account failed",
        { error: error.message },
        "AccountController"
      );

      const response: ErrorResponse = {
        success: false,
        error: error.message,
      };

      res.status(500).json(response);
    }
  }

  static async removeAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const success = storage.removeAccount(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Account not found",
        });
      }

      logger.info("Account removed", { accountId: id }, "AccountController");
      res.json({ success: true });
    } catch (error: any) {
      logger.error(
        "Remove account failed",
        { error: error.message },
        "AccountController"
      );

      const response: ErrorResponse = {
        success: false,
        error: error.message,
      };

      res.status(500).json(response);
    }
  }

  static async switchAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.body;

      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: "accountId is required",
        });
      }

      const success = await storage.setActiveAccount(accountId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Account not found",
        });
      }

      logger.info("Account switched", { accountId }, "AccountController");
      res.json({ success: true });
    } catch (error: any) {
      logger.error(
        "Switch account failed",
        { error: error.message },
        "AccountController"
      );

      const response: ErrorResponse = {
        success: false,
        error: error.message,
      };

      res.status(500).json(response);
    }
  }
}
