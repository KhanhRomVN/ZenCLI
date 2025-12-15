import { Request, Response, NextFunction } from "express";
import { Account } from "../../core/types/index.js";

export interface AuthRequest extends Request {
  accountId?: string;
}

export interface LoginResponse {
  success: boolean;
  account?: {
    id: string;
    name: string;
    email?: string;
    orgId: string;
  };
  error?: string;
}

export interface AccountsResponse {
  success: boolean;
  accounts?: Array<{
    id: string;
    username: string; // Changed from name
    email: string; // Made required
    isActive: boolean;
    reqCount: number;
    inputTokens: number;
    outputTokens: number;
    conversationId?: string | null;
  }>;
  error?: string;
}

export interface ChatCreateResponse {
  success: boolean;
  conversationId?: string;
  parentMessageUuid?: string;
  error?: string;
}

export interface ChatSendRequest {
  conversationId?: string;
  parentMessageUuid?: string;
  message: string;
  stream?: boolean;
  files?: any[];
}

export interface ChatSendResponse {
  success: boolean;
  messageUuid?: string;
  conversationId: string;
  parentMessageUuid: string;
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  accounts: number;
  activeAccount?: {
    id: string;
    name: string;
    email?: string;
  };
}

export interface Metrics {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byPath: Record<string, number>;
    byStatus: Record<number, number>;
  };
  responseTimes: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

export interface WebSocketMessage {
  type: "message" | "notification" | "error" | "status";
  data: any;
  timestamp: number;
}

export interface SSEConnection {
  id: string;
  res: Response;
  createdAt: number;
  lastActivity: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ServerStats {
  startedAt: number;
  uptime: number;
  requests: {
    total: number;
    successful: number;
    failed: number;
  };
  connections: {
    active: number;
    total: number;
  };
  memory: NodeJS.MemoryUsage;
  accounts: {
    total: number;
    active: number;
  };
  conversations: {
    total: number;
  };
}
