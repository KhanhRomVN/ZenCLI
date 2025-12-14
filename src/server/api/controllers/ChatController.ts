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
      const { conversationId, parentMessageUuid, message, stream } =
        req.body as ChatSendRequest;

      // In the new flow, we use the active account.
      const activeAccount = storage.getActiveAccount();
      if (!activeAccount) {
        return res
          .status(401)
          .json({ success: false, error: "No active account selected" });
      }

      // If conversationId is missing, we might need to create one or handle it.
      // For now assume standard flow where client provides IDs or empty for new.

      const apiClient = getApiClient();

      // Update account stats (Request count)
      // Note: This logic for updating stats ideally belongs in a service layer or storage method
      // that handles atomicity, but for this refactor we do it here.
      // We need to fetch latest account data to ensure we don't overwrite.
      const accounts = storage.getAccounts();
      const accountIndex = accounts.findIndex((a) => a.id === activeAccount.id);

      if (accountIndex !== -1) {
        const acc = accounts[accountIndex];
        const today = new Date().toISOString().split("T")[0];

        if (acc.lastReqDate !== today) {
          acc.dailyReqCount = 0;
          acc.lastReqDate = today;
        }
        acc.dailyReqCount = (acc.dailyReqCount || 0) + 1;

        // We will update tokens after response
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

        // Update output tokens estimation (rough)
        // In a real app, API returns usage. Here we allow the apiClient to hopefully return it
        // but since we are streaming, we might not get it in the callback easily unless changed.
        // For now, let's just log it.
      } else {
        const result = await apiClient.sendMessage(
          conversationId,
          parentMessageUuid,
          message
        );

        // Update usage stats if available
        if (result.inputTokens || result.outputTokens) {
          const currentAccounts = storage.getAccounts();
          const accIdx = currentAccounts.findIndex(
            (a) => a.id === activeAccount.id
          );
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
