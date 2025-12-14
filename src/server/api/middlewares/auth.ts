import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../types/index.js";
import { storage } from "../../../core/lib/storage.js";

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const activeAccount = storage.getActiveAccount();

  if (!activeAccount) {
    return res.status(401).json({
      success: false,
      error: "No active account. Please login first.",
    });
  }

  req.accountId = activeAccount.id;
  next();
};
