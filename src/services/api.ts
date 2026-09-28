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

// ─── Types ──────────────────────────────────────────────────────────────

export interface Provider {
  provider_id: string;
  provider_name: string;
  is_enabled: boolean;
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
  user_data_dir?: string;
}

interface CreateAccountPayload {
  provider_id: string;
  email: string;
  name?: string;
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

export async function fetchAccounts(
  providerId?: string,
): Promise<Account[]> {
  const params = new URLSearchParams();
  if (providerId) params.append("provider_id", providerId);

  const query = params.toString();
  const endpoint = `/v1/accounts${query ? `?${query}` : ""}`;

  const result = await callBackend<{
    success: boolean;
    data: { accounts: Account[] };
  }>(endpoint);

  return result.success && result.data?.accounts ? result.data.accounts : [];
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