import { Request, Response, NextFunction } from "express";
import { logger } from "../../../core/lib/logger.js";

export const validateLoginRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Login doesn't require any body parameters
  next();
};

export const validateSwitchAccountRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { accountId } = req.body;

  if (!accountId || typeof accountId !== "string") {
    logger.warn("Invalid switch account request", { accountId }, "Validator");
    return res.status(400).json({
      success: false,
      error: "accountId is required and must be a string",
    });
  }

  next();
};

export const validateCreateConversationRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { model } = req.body;

  if (model && typeof model !== "string") {
    logger.warn("Invalid create conversation request", { model }, "Validator");
    return res.status(400).json({
      success: false,
      error: "model must be a string if provided",
    });
  }

  next();
};

export const validateSendMessageRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { conversationId, parentMessageUuid, message, stream } = req.body;

  if (!conversationId || typeof conversationId !== "string") {
    logger.warn(
      "Invalid send message request - missing conversationId",
      { conversationId },
      "Validator"
    );
    return res.status(400).json({
      success: false,
      error: "conversationId is required and must be a string",
    });
  }

  if (!parentMessageUuid || typeof parentMessageUuid !== "string") {
    logger.warn(
      "Invalid send message request - missing parentMessageUuid",
      { parentMessageUuid },
      "Validator"
    );
    return res.status(400).json({
      success: false,
      error: "parentMessageUuid is required and must be a string",
    });
  }

  if (!message || typeof message !== "string") {
    logger.warn(
      "Invalid send message request - missing message",
      { message },
      "Validator"
    );
    return res.status(400).json({
      success: false,
      error: "message is required and must be a string",
    });
  }

  if (stream !== undefined && typeof stream !== "boolean") {
    logger.warn(
      "Invalid send message request - invalid stream",
      { stream },
      "Validator"
    );
    return res.status(400).json({
      success: false,
      error: "stream must be a boolean if provided",
    });
  }

  next();
};

export const validateRemoveAccountRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    logger.warn("Invalid remove account request", { id }, "Validator");
    return res.status(400).json({
      success: false,
      error: "Account ID is required",
    });
  }

  next();
};
