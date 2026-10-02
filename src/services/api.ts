/**
 * ------------------------------------------------------------------
 * API Service — Backend communication layer for ZenCLI
 * ------------------------------------------------------------------
 * Provides:
 * - getApiUrl / setApiUrl: persist backend URL to ~/.zencli/config.json
 * - fetchProviders / fetchAccounts / createAccount / deleteAccount:
 *   REST wrappers matching the Zen backend API contract
 * ------------------------------------------------------------------
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── File Logger ──────────────────────────────────────────────────────────────
const LOG_FILE = path.join(process.cwd(), "log.log");

export function logToFile(message: string): void {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`, "utf-8");
  } catch {
    // Silently ignore logging errors to avoid disrupting the app
  }
}

// ─── Types ──────────────────────────────────────────────────────────────

export interface Provider {
  provider_id: string;
  provider_name: string;
  is_enabled: boolean;
  website?: string;
  models: { id: string; name?: string }[];
}

export interface ConversationMetadata {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  totalRequests?: number;
  messageCount?: number;
}

export interface Account {
  id: string;
  provider_id: string;
  email: string;
  name?: string;
  credential?: string;
  is_enabled: boolean;
  is_active_cli?: boolean;
  total_requests?: number;
  successful_requests?: number;
  total_tokens?: number;
  period_requests?: number;
  period_tokens?: number;
  auth_method?: string;
  user_data_dir?: string;
}

interface CreateAccountPayload {
  provider_id: string;
  email: string;
  name?: string;
  credential?: string;
}

// ─── Config persistence ─────────────────────────────────────────────────

const CONFIG_DIR = path.join(os.homedir(), ".zencli");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function readConfig(): Record<string, any> {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeConfig(config: Record<string, any>): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// ─── API URL ────────────────────────────────────────────────────────────

const DEFAULT_API_URL = "http://localhost:3000";

export function getApiUrl(): string {
  const config = readConfig();
  return config.apiUrl || DEFAULT_API_URL;
}

export function setApiUrl(url: string): void {
  const config = readConfig();
  config.apiUrl = url;
  writeConfig(config);
}

// ─── Backend caller ─────────────────────────────────────────────────────

async function callBackend<T = any>(
  endpoint: string,
  method: string = "GET",
  body?: any,
): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// ─── Providers ──────────────────────────────────────────────────────────

export async function fetchProviders(): Promise<Provider[]> {
  const result = await callBackend<{ success: boolean; data: Provider[] }>(
    "/v1/providers",
  );
  return result.success && result.data ? result.data : [];
}

// ─── Accounts ───────────────────────────────────────────────────────────

export interface AccountsResponse {
  accounts: Account[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export async function fetchAccounts(
  options: {
    providerId?: string;
    page?: number;
    limit?: number;
    period?: "day" | "week" | "month";
  } = {},
): Promise<AccountsResponse> {
  const { providerId, page = 1, limit = 50, period = "day" } = options;
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    period,
    offset: "0",
  });

  if (providerId) params.append("provider_id", providerId);
  
  const clientId = process.env.ZEN_CLIENT_ID || process.env.CLIENT_ID || "";
  if (clientId) params.append("clientId", clientId);

  const query = params.toString();
  const endpoint = `/v1/accounts${query ? `?${query}` : ""}`;

  logToFile(`fetchAccounts: endpoint=${endpoint}, opts=${JSON.stringify(options)}, clientId=${clientId || "(empty)"}`);

  try {
    const result = await callBackend<{
      success: boolean;
      data: { 
        accounts: Account[];
        pagination?: { total: number; page: number; limit: number; total_pages: number };
      };
    }>(endpoint);

    if (!result.success || !result.data) {
      throw new Error("Invalid response structure");
    }

    const accounts = result.data.accounts || [];
    const pagination = result.data.pagination || {
      total: accounts.length,
      page,
      limit,
      total_pages: Math.ceil(accounts.length / limit) || 1,
    };

    logToFile(`fetchAccounts response: count=${accounts.length}, total=${pagination.total}`);

    return { accounts, pagination };
  } catch (err) {
    logToFile(`fetchAccounts ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return {
      accounts: [],
      pagination: { total: 0, page: 1, limit, total_pages: 1 },
    };
  }
}

export async function createAccount(
  payload: CreateAccountPayload,
): Promise<boolean> {
  try {
    const result = await callBackend<{ success: boolean }>(
      "/v1/accounts",
      "POST",
      payload,
    );
    return result.success === true;
  } catch {
    return false;
  }
}

export async function deleteAccount(id: string): Promise<boolean> {
  try {
    const result = await callBackend<{ success: boolean }>(
      `/v1/accounts/${id}`,
      "DELETE",
    );
    return result.success === true;
  } catch {
    return false;
  }
}

// ─── Database Managers ──────────────────────────────────────────────────

export interface DatabaseManagerRow {
  id: string;
  name: string;
  type: "local-file" | "connection";
  db_type?: string;
  file_path?: string;
  host?: string;
  port?: number;
  database_name?: string;
  username?: string;
  password?: string;
  ssl_mode?: string;
  channel_binding?: string;
  icon?: string | null;
  color?: string | null;
  last_test_status?: string | null;
  last_test_at?: number | null;
}

async function callBackendWithHeaders<T = any>(
  endpoint: string,
  method: string = "GET",
  body?: any,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    cache: "no-store",
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchDatabaseManagers(
  activeId?: string,
): Promise<DatabaseManagerRow[]> {
  const headers: Record<string, string> = {};
  if (activeId) headers["x-database-manager-id"] = activeId;

  try {
    const result = await callBackendWithHeaders<{ success: boolean; data: DatabaseManagerRow[] }>(
      "/v1/database-managers",
      "GET",
      undefined,
      headers,
    );
    return result.success && Array.isArray(result.data) ? result.data : [];
  } catch {
    return [];
  }
}


// ─── Stats ──────────────────────────────────────────────────────────────

export interface UsageItem {
  date: string;
  requests: number;
  tokens: number;
}

export interface ModelStatItem {
  model_id: string;
  provider_id: string;
  total_requests: number;
  total_tokens: number;
}

export interface StatsResponse {
  success: boolean;
  data: {
    usage: UsageItem[];
    models: ModelStatItem[];
  };
}

export async function fetchStats(period: string = "day"): Promise<StatsResponse | null> {
  try {
    const clientId = process.env.ZEN_CLIENT_ID || process.env.CLIENT_ID || "";
    const params = new URLSearchParams({ period });
    if (clientId) params.append("clientId", clientId);
    
    const endpoint = `/v1/stats?${params.toString()}`;
    logToFile(`fetchStats: calling ${endpoint}`);
    
    const result = await callBackend<StatsResponse>(endpoint);
    logToFile(`fetchStats response: success=${result.success}, usageCount=${result.data?.usage?.length ?? 0}, modelCount=${result.data?.models?.length ?? 0}`);
    
    return result;
  } catch (err) {
    logToFile(`fetchStats ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}