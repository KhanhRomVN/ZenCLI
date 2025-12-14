import { NextFunction, Request, Response } from "express";
import { logger } from "../../core/lib/logger.js";
import {
  ServerStats,
  SSEConnection,
  WebSocketMessage,
} from "../types/index.js";

export class ServerUtils {
  private static connections: Map<string, SSEConnection> = new Map();
  private static stats: ServerStats = {
    startedAt: Date.now(),
    uptime: 0,
    requests: {
      total: 0,
      successful: 0,
      failed: 0,
    },
    connections: {
      active: 0,
      total: 0,
    },
    memory: process.memoryUsage(),
    accounts: {
      total: 0,
      active: 0,
    },
    conversations: {
      total: 0,
    },
  };

  static generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static setupSSE(req: Request, res: Response): string {
    const connectionId = this.generateConnectionId();

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const connection: SSEConnection = {
      id: connectionId,
      res,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.connections.set(connectionId, connection);
    this.stats.connections.active++;
    this.stats.connections.total++;

    // Send initial connection message
    this.sendSSEMessage(connectionId, {
      type: "status",
      data: { connected: true, connectionId },
      timestamp: Date.now(),
    });

    // Handle client disconnect
    req.on("close", () => {
      this.connections.delete(connectionId);
      this.stats.connections.active--;
      logger.info("SSE connection closed", { connectionId }, "ServerUtils");
    });

    return connectionId;
  }

  static sendSSEMessage(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn(
        "Attempted to send message to non-existent connection",
        { connectionId },
        "ServerUtils"
      );
      return false;
    }

    try {
      connection.res.write(`data: ${JSON.stringify(message)}\n\n`);
      connection.lastActivity = Date.now();
      return true;
    } catch (error) {
      logger.error(
        "Failed to send SSE message",
        { connectionId, error: (error as Error).message },
        "ServerUtils"
      );
      return false;
    }
  }

  static broadcast(message: WebSocketMessage) {
    let successCount = 0;
    let failCount = 0;

    this.connections.forEach((connection, connectionId) => {
      if (this.sendSSEMessage(connectionId, message)) {
        successCount++;
      } else {
        failCount++;
      }
    });

    logger.debug(
      "Broadcast message",
      { successCount, failCount, type: message.type },
      "ServerUtils"
    );
  }

  static cleanupInactiveConnections(timeoutMs: number = 300000) {
    const now = Date.now();
    let cleaned = 0;

    this.connections.forEach((connection, connectionId) => {
      if (now - connection.lastActivity > timeoutMs) {
        try {
          connection.res.end();
        } catch (error) {
          // Ignore errors
        }
        this.connections.delete(connectionId);
        this.stats.connections.active--;
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.info(
        "Cleaned up inactive connections",
        { count: cleaned },
        "ServerUtils"
      );
    }
  }

  static updateRequestStats(success: boolean) {
    this.stats.requests.total++;
    if (success) {
      this.stats.requests.successful++;
    } else {
      this.stats.requests.failed++;
    }
  }

  static updateMemoryStats() {
    this.stats.memory = process.memoryUsage();
  }

  static updateUptime() {
    this.stats.uptime = Date.now() - this.stats.startedAt;
  }

  static getStats(): ServerStats {
    this.updateUptime();
    this.updateMemoryStats();
    return { ...this.stats };
  }

  static formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  static formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, "") // Remove HTML tags
      .replace(/[\\"']/g, "") // Remove quotes and backslashes
      .trim();
  }

  static generateApiKey(): string {
    const crypto = require("crypto");
    return `zencli_${crypto.randomBytes(32).toString("hex")}`;
  }

  static calculateRateLimitHeaders(
    limit: number,
    remaining: number,
    resetTime: number
  ) {
    return {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": resetTime.toString(),
    };
  }

  static handleAsyncError(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static createSuccessResponse<T>(data: T, meta?: any): any {
    return {
      success: true,
      data,
      ...(meta && { meta }),
    };
  }

  static createErrorResponse(
    message: string,
    code?: string,
    errors?: any[]
  ): any {
    const response: any = {
      success: false,
      error: message,
    };

    if (code) {
      response.code = code;
    }

    if (errors) {
      response.errors = errors;
    }

    return response;
  }

  static parsePaginationParams(req: Request): {
    page: number;
    limit: number;
    skip: number;
  } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20)
    );
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  static createPaginationMeta(page: number, limit: number, total: number): any {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  static compressIfNeeded(data: any): Buffer {
    const jsonString = JSON.stringify(data);
    if (jsonString.length > 1024) {
      // Only compress if larger than 1KB
      try {
        const zlib = require("zlib");
        return zlib.gzipSync(jsonString);
      } catch (error) {
        logger.warn(
          "Compression failed, sending uncompressed",
          { error: (error as Error).message },
          "ServerUtils"
        );
      }
    }
    return Buffer.from(jsonString);
  }

  static setCacheHeaders(res: Response, maxAge: number = 300) {
    res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
    res.setHeader("Last-Modified", new Date().toUTCString());
  }

  static validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

// Start cleanup interval
setInterval(() => {
  ServerUtils.cleanupInactiveConnections();
}, 60000); // Clean up every minute

// Update memory stats periodically
setInterval(() => {
  ServerUtils.updateMemoryStats();
}, 5000); // Update every 5 seconds
