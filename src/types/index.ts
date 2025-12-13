// File: src/types/index.ts

export interface TokenUsage {
  input: number;
  output: number;
  totalCost?: number;
}

export interface ConversationHistory {
  id: string;
  name: string;
  model: string;
  messageCount: number;
  createdAt: number;
  lastMessageAt: number;
  tokenUsage: TokenUsage;
}

export interface ChatSession {
  conversationId: string;
  parentMessageUuid: string;
  messages: Message[];
  tokenUsage: TokenUsage;
  startedAt: number;
}
export interface Account {
  id: string;
  name: string;
  email?: string;
  orgId: string;
  sessionKey: string;
  cookieString?: string;
  addedAt: number;
  lastUsed: number;
}

export interface Config {
  accounts: Account[];
  activeAccountId?: string;
  defaultModel: string;
  deviceId?: string;
  anonymousId?: string;
  theme?: "dark" | "light" | "auto";
  enableStreaming?: boolean;
  showTimestamps?: boolean;
  maxConversations?: number;
  tokenUsage?: Record<string, { input: number; output: number }>;
  conversationHistory?: any[];
}

export interface Conversation {
  uuid: string;
  name: string;
  updated_at: string;
  model?: string;
  message_count?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  conversationId?: string;
  model?: string;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export interface StreamChunk {
  text: string;
  complete?: boolean;
  steps?: any[];
  messageUuid?: string;
}

export interface ChatMessage {
  prompt: string;
  attachments?: any[];
  files?: any[];
  sync_sources?: any[];
}

export interface UploadFilePayload {
  name: string;
  size: number;
  type: string;
  data: ArrayBuffer | Buffer | Uint8Array | string;
}

export interface AttachmentPayload {
  document_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url?: string;
  extracted_content?: string;
}

export interface ClaudeModel {
  id: string;
  name: string;
  description?: string;
  max_tokens?: number;
  capabilities?: string[];
  is_default?: boolean;
}

export interface UserPreferences {
  autoComplete: boolean;
  syntaxHighlighting: boolean;
  wordWrap: boolean;
  fontSize: number;
  fontFamily: string;
  showLineNumbers: boolean;
}

export interface ChatState {
  conversationId?: string;
  parentMessageUuid?: string;
  messages: Message[];
  isStreaming: boolean;
  lastUpdated: number;
}

export interface FileContext {
  folderPath: string;
  files: string[];
  totalFiles: number;
  lastScanned: number;
}

export interface CommandHistory {
  command: string;
  timestamp: number;
  success: boolean;
  output?: string;
}

export interface ZenCliStats {
  totalMessages: number;
  totalConversations: number;
  totalTokens: number;
  favoriteModel: string;
  mostActiveHour: number;
  lastActive: number;
}

export interface BrowserProfile {
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  locale: string;
  timezone: string;
}

export interface LoginOptions {
  headless?: boolean;
  timeout?: number;
  userDataDir?: string;
  executablePath?: string;
}

export interface AuthResult {
  success: boolean;
  account?: Account;
  error?: string;
  cookies?: any[];
  sessionValid?: boolean;
}

export interface ConversationSummary {
  uuid: string;
  name: string;
  preview: string;
  model: string;
  messageCount: number;
  lastMessageTime: number;
}

export interface StreamingOptions {
  onText?: (text: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy: "updated" | "created" | "name";
  sortOrder: "asc" | "desc";
}

export interface SearchOptions {
  query: string;
  searchIn: ("messages" | "conversations" | "files")[];
  limit?: number;
}

export interface ExportOptions {
  format: "json" | "txt" | "md" | "pdf";
  includeMetadata: boolean;
  includeTimestamps: boolean;
}

export interface ImportOptions {
  format: "json" | "txt" | "md";
  mergeExisting: boolean;
  validateBeforeImport: boolean;
}

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface Keybind {
  key: string;
  action: string;
  description: string;
  global?: boolean;
}

export interface Theme {
  name: string;
  type: "dark" | "light";
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    accent: string;
    muted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  commands: string[];
  dependencies?: string[];
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  downloadUrl?: string;
  publishDate?: string;
}

export interface SystemInfo {
  platform: NodeJS.Platform;
  arch: string;
  nodeVersion: string;
  npmVersion: string;
  zencliVersion: string;
  storagePath: string;
  configPath: string;
  logsPath: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface ClaudeAPIError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

export interface ChatCompletionOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop_sequences?: string[];
  streaming?: boolean;
  metadata?: Record<string, any>;
}

// Event Types
export type EventType =
  | "login"
  | "logout"
  | "message_sent"
  | "message_received"
  | "conversation_created"
  | "conversation_deleted"
  | "account_switched"
  | "file_uploaded"
  | "error_occurred"
  | "app_started"
  | "app_closed";

export interface EventPayload {
  type: EventType;
  timestamp: number;
  data?: any;
  userId?: string;
}

// Configuration Types
export interface NetworkConfig {
  timeout: number;
  retries: number;
  baseURL: string;
  userAgent: string;
  proxy?: string;
}

export interface UIConfig {
  showWelcome: boolean;
  animations: boolean;
  progressBars: boolean;
  confirmExit: boolean;
  autoClear: boolean;
  colorScheme: "auto" | "dark" | "light";
}

export interface SecurityConfig {
  encryptStorage: boolean;
  sessionTimeout: number;
  clearClipboard: boolean;
  logSensitiveData: boolean;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

// API Types
export interface ClaudeOrganization {
  uuid: string;
  name: string;
  settings: {
    default_model: string;
    max_tokens: number;
    temperature: number;
  };
}

export interface ClaudeUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  organizations: ClaudeOrganization[];
}

export interface ClaudeConversation {
  uuid: string;
  name: string;
  summary?: string;
  created_at: string;
  updated_at: string;
  last_read?: string;
  model: string;
  message_count: number;
}

export interface ClaudeMessage {
  uuid: string;
  text: string;
  sender: "human" | "assistant";
  created_at: string;
  updated_at: string;
  model?: string;
  steps?: any[];
  citations?: any[];
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Export/Import Types
export interface ExportData {
  version: string;
  exportDate: string;
  accounts: Account[];
  conversations: Conversation[];
  messages: Message[];
  settings: Config;
}

// Plugin System Types
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  homepage?: string;
  repository?: string;
  main: string;
  commands?: {
    name: string;
    description: string;
    usage?: string;
    flags?: Record<string, any>;
  }[];
  hooks?: {
    [hook: string]: string[];
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// Logging Types
export interface LogEntry {
  timestamp: number;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  message: string;
  data?: any;
  source?: string;
  userId?: string;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

// Update Types
export interface VersionInfo {
  version: string;
  name?: string;
  releaseDate: string;
  changelog: string[];
  downloadUrl: string;
  checksum?: string;
  signature?: string;
  minimumNodeVersion?: string;
  breakingChanges?: string[];
}

// Backup Types
export interface BackupInfo {
  id: string;
  timestamp: number;
  size: number;
  items: {
    accounts: number;
    conversations: number;
    messages: number;
  };
  checksum: string;
  path: string;
}

// Index Signature for dynamic objects
export interface StringMap {
  [key: string]: string;
}

export interface NumberMap {
  [key: string]: number;
}

export interface BooleanMap {
  [key: string]: boolean;
}

// Response Wrappers
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
  requestId?: string;
}

// Feature Flags
export interface FeatureFlags {
  enableMultiAccount: boolean;
  enableFileUpload: boolean;
  enableStreaming: boolean;
  enablePlugins: boolean;
  enableThemes: boolean;
  enableAutoUpdate: boolean;
  enableBackup: boolean;
  enableAnalytics: boolean;
}

// Analytics Events
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

// Enums
export enum AuthStatus {
  NOT_AUTHENTICATED = "not_authenticated",
  AUTHENTICATED = "authenticated",
  EXPIRED = "expired",
  ERROR = "error",
}

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

export enum ConversationStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
  DELETED = "deleted",
}

export enum FileType {
  TEXT = "text",
  IMAGE = "image",
  PDF = "pdf",
  CODE = "code",
  OTHER = "other",
}

export enum CommandCategory {
  CHAT = "chat",
  ACCOUNT = "account",
  CONVERSATION = "conversation",
  FILE = "file",
  SYSTEM = "system",
  PLUGIN = "plugin",
}

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

// Constants
export const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
export const DEFAULT_THEME = "dark";
export const DEFAULT_MAX_CONVERSATIONS = 100;
export const DEFAULT_SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper Types
export type PartialConfig = Partial<Config>;
export type PartialAccount = Partial<Account>;
export type PartialMessage = Partial<Message>;

// Union Types
export type StorageKey =
  | "accounts"
  | "activeAccountId"
  | "defaultModel"
  | "theme"
  | "userPreferences"
  | "commandHistory"
  | "stats";

export type ClaudeEndpoint =
  | "/api/auth/session"
  | "/api/organizations/{orgId}/chat_conversations"
  | "/api/organizations/{orgId}/chat_conversations/{conversationId}"
  | "/api/organizations/{orgId}/chat_conversations/{conversationId}/completion"
  | "/api/organizations/{orgId}/upload"
  | "/api/organizations/{orgId}/models";

// Utility function types
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
export type SyncFunction<T = any> = (...args: any[]) => T;
export type CallbackFunction<T = any> = (
  error: Error | null,
  result?: T
) => void;

// Type Guards
export function isAccount(obj: any): obj is Account {
  return (
    obj &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.orgId === "string" &&
    typeof obj.sessionKey === "string" &&
    typeof obj.addedAt === "number" &&
    typeof obj.lastUsed === "number"
  );
}

export function isConfig(obj: any): obj is Config {
  return (
    obj &&
    Array.isArray(obj.accounts) &&
    obj.accounts.every(isAccount) &&
    typeof obj.defaultModel === "string"
  );
}

export function isMessage(obj: any): obj is Message {
  return (
    obj &&
    typeof obj.id === "string" &&
    (obj.role === "user" || obj.role === "assistant") &&
    typeof obj.content === "string" &&
    typeof obj.timestamp === "number"
  );
}

// Ensure this file is treated as a module
export {};
