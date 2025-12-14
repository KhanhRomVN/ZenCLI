import { Request, Response } from "express";
import { getApiClient } from "../../../core/lib/api-client.js";
import { storage } from "../../../core/lib/storage.js";
import { logger } from "../../../core/lib/logger.js";
import {
  ChatSendRequest,
  ChatSendResponse,
  ErrorResponse,
} from "../../types/index.js";

export class ChatController {
  static async selectAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        return res
          .status(400)
          .json({ success: false, error: "accountId is required" });
      }

      const success = await storage.setActiveAccount(accountId);
      if (!success) {
        return res
          .status(404)
          .json({ success: false, error: "Account not found" });
      }

      logger.info("Account selected for chat", { accountId }, "ChatController");
      res.json({ success: true });
    } catch (error: any) {
      logger.error(
        "Select account failed",
        { error: error.message },
        "ChatController"
      );
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async sendMessage(req: Request, res: Response) {
    try {
      const { accountId, conversationId, parentMessageUuid, message, stream } =
        req.body as ChatSendRequest & { accountId: string };

      // Validate required fields
      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: "accountId is required",
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          error: "message is required",
        });
      }

      // Get the account
      const accounts = storage.getAccounts();
      const account = accounts.find((a) => a.id === accountId);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: "Account not found",
        });
      }

      // Set as active account temporarily for this request
      await storage.setActiveAccount(accountId);

      const apiClient = getApiClient();

      // Update account stats (Request count)
      const accountIndex = accounts.findIndex((a) => a.id === accountId);
      if (accountIndex !== -1) {
        const acc = accounts[accountIndex];
        const today = new Date().toISOString().split("T")[0];

        if (acc.lastReqDate !== today) {
          acc.dailyReqCount = 0;
          acc.lastReqDate = today;
        }
        acc.dailyReqCount = (acc.dailyReqCount || 0) + 1;

        storage.saveAccounts(accounts);
      }

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let fullContent = "";

        await apiClient.sendMessage(
          conversationId,
          parentMessageUuid,
          message,
          (chunk) => {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            fullContent += chunk;
          }
        );

        // After stream ends
        res.write(`data: [DONE]\n\n`);
        res.end();
      } else {
        const result = await apiClient.sendMessage(
          conversationId,
          parentMessageUuid,
          message
        );

        // Update usage stats if available
        if (result.inputTokens || result.outputTokens) {
          const currentAccounts = storage.getAccounts();
          const accIdx = currentAccounts.findIndex((a) => a.id === accountId);
          if (accIdx !== -1) {
            currentAccounts[accIdx].inputTokens =
              (currentAccounts[accIdx].inputTokens || 0) +
              (result.inputTokens || 0);
            currentAccounts[accIdx].outputTokens =
              (currentAccounts[accIdx].outputTokens || 0) +
              (result.outputTokens || 0);
            storage.saveAccounts(currentAccounts);
          }
        }

        const response: ChatSendResponse = {
          success: true,
          messageUuid: result.messageUuid,
          content: result.content,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };

        logger.info(
          "Message sent",
          {
            accountId,
            conversationId,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          },
          "ChatController"
        );

        res.json(response);
      }
    } catch (error: any) {
      logger.error(
        "Send message failed",
        { error: error.message },
        "ChatController"
      );

      const response: ErrorResponse = {
        success: false,
        error: error.message,
      };

      res.status(500).json(response);
    }
  }
}
