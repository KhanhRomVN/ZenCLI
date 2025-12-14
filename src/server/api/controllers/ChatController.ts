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

  static async newConversation(req: Request, res: Response) {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        return res
          .status(400)
          .json({ success: false, error: "accountId is required" });
      }

      const accounts = storage.getAccounts();
      const accountIndex = accounts.findIndex((a) => a.id === accountId);

      if (accountIndex === -1) {
        return res
          .status(404)
          .json({ success: false, error: "Account not found" });
      }

      const apiClient = getApiClient();

      // Create new conversation on Claude
      const newConv = await apiClient.createConversation(
        storage.getDefaultModel()
      );

      // Update account with new conversationId
      accounts[accountIndex].conversationId = newConv.conversationId;
      storage.saveAccounts(accounts);

      logger.info(
        "New conversation created and saved to account",
        { accountId, conversationId: newConv.conversationId },
        "ChatController"
      );

      res.json({
        success: true,
        conversationId: newConv.conversationId,
        parentMessageUuid: newConv.parentMessageUuid,
      });
    } catch (error: any) {
      logger.error(
        "New conversation failed",
        { error: error.message },
        "ChatController"
      );
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getHistory(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        return res
          .status(400)
          .json({ success: false, error: "conversationId is required" });
      }

      const apiClient = getApiClient();

      // We need to find which account has this conversationId to properly set cookies/session?
      // Actually ApiClient currently uses 'this.account' which is set via storage.getActiveAccount().
      // For proper operation, we should probably ensure the active account matches the conversation,
      // but 'getConversation' doesn't necessarily need authentication if the session key is valid.
      // However, usually we should check access. For CLI simplicity, we rely on current active account
      // OR we look up the account if possible.
      // Since ApiClient is singleton and stateful (active account), let's assume the user selects
      // the account first or the current active account is correct.
      // IMPROVEMENT: Pass accountId in query param if needed.

      try {
        const conversation = await apiClient.getConversation(conversationId);
        res.json({ success: true, conversation });
      } catch (err: any) {
        // If generic get fails, maybe conversation belongs to another account?
        // For now, return error.
        throw err;
      }
    } catch (error: any) {
      logger.error(
        "Get history failed",
        { error: error.message },
        "ChatController"
      );
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async sendMessage(req: Request, res: Response) {
    try {
      let { accountId, conversationId, parentMessageUuid, message, stream } =
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
      const accountIndex = accounts.findIndex((a) => a.id === accountId);

      if (accountIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "Account not found",
        });
      }

      // Set as active account temporarily for this request
      await storage.setActiveAccount(accountId);

      const apiClient = getApiClient();

      // Check if conversationId is valid UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!conversationId || !uuidRegex.test(conversationId)) {
        logger.info(
          "Invalid or missing conversationId, creating new one",
          { originalId: conversationId },
          "ChatController"
        );
        const newConv = await apiClient.createConversation(
          storage.getDefaultModel()
        );
        conversationId = newConv.conversationId;
        parentMessageUuid = newConv.parentMessageUuid;
      }

      // Now conversationId is guaranteed to be a valid string
      // Ensure parentMessageUuid is also a string if it was undefined
      if (!parentMessageUuid) {
        parentMessageUuid = conversationId;
      }

      // Update account stats (Request count) & SAVE CONVERSATION ID
      const acc = accounts[accountIndex];
      const today = new Date().toISOString().split("T")[0];

      if (acc.lastReqDate !== today) {
        acc.dailyReqCount = 0;
        acc.lastReqDate = today;
      }
      acc.dailyReqCount = (acc.dailyReqCount || 0) + 1;

      // Save the active conversation ID to the account
      acc.conversationId = conversationId;

      storage.saveAccounts(accounts);

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Send initial metadata event containing the conversation IDs
        res.write(`event: metadata\n`);
        res.write(
          `data: ${JSON.stringify({ conversationId, parentMessageUuid })}\n\n`
        );

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
          conversationId,
          parentMessageUuid,
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
