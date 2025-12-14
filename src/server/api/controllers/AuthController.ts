import { Request, Response } from "express";
import { authManager } from "../../../core/lib/auth-manager.js";
import { storage } from "../../../core/lib/storage.js";
import { logger } from "../../../core/lib/logger.js";
import { LoginResponse, ErrorResponse } from "../../types/index.js";

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      logger.info("Login request received", {}, "AuthController");

      const account = await authManager.login();

      const response: LoginResponse = {
        success: true,
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          orgId: account.orgId,
        },
      };

      logger.info(
        "Login successful",
        { accountId: account.id },
        "AuthController"
      );
      res.json(response);
    } catch (error: any) {
      logger.error("Login failed", { error: error.message }, "AuthController");

      const response: ErrorResponse = {
        success: false,
        error: error.message,
      };

      res.status(500).json(response);
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      await authManager.logout();

      logger.info("Logout successful", {}, "AuthController");
      res.json({ success: true });
    } catch (error: any) {
      logger.error("Logout failed", { error: error.message }, "AuthController");

      const response: ErrorResponse = {
        success: false,
        error: error.message,
      };

      res.status(500).json(response);
    }
  }

  static async getSession(req: Request, res: Response) {
    try {
      const account = storage.getActiveAccount();

      if (!account) {
        return res.json({
          success: true,
          authenticated: false,
        });
      }

      res.json({
        success: true,
        authenticated: true,
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          orgId: account.orgId,
        },
      });
    } catch (error: any) {
      logger.error(
        "Get session failed",
        { error: error.message },
        "AuthController"
      );

      const response: ErrorResponse = {
        success: false,
        error: error.message,
      };

      res.status(500).json(response);
    }
  }
}
