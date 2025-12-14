// Constants for ZenCLI

export const APP_NAME = "ZenCLI";
export const APP_VERSION = "1.0.0";
export const APP_DESCRIPTION = "ZenCLI - Interactive Terminal UI for Claude AI";

// Claude API
export const CLAUDE_BASE_URL = "https://claude.ai";
export const CLAUDE_API_BASE = `${CLAUDE_BASE_URL}/api`;
export const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
export const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
];

// Storage
export const STORAGE_KEYS = {
  ACCOUNTS: "accounts",
  ACTIVE_ACCOUNT_ID: "activeAccountId",
  DEFAULT_MODEL: "defaultModel",
  DEVICE_ID: "deviceId",
  ANONYMOUS_ID: "anonymousId",
  THEME: "theme",
  TOKEN_USAGE: "tokenUsage",
  CONVERSATION_HISTORY: "conversationHistory",
  USER_PREFERENCES: "userPreferences",
  COMMAND_HISTORY: "commandHistory",
  STATS: "stats",
} as const;

// Server
export const DEFAULT_SERVER_PORT = 3000;
export const DEFAULT_SERVER_HOST = "localhost";
export const SERVER_RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
} as const;

// Logging
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
} as const;

export const DEFAULT_LOG_LEVEL = LOG_LEVELS.INFO;

// User Interface
export const THEMES = ["dark", "light", "auto"] as const;
export type ThemeType = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemeType = "dark";

export const UI = {
  MAX_CONVERSATIONS: 100,
  MESSAGES_PER_PAGE: 20,
  AUTO_COMPLETE_DELAY: 300, // ms
  TYPING_INDICATOR_DELAY: 1000, // ms
} as const;

// Authentication
export const AUTH = {
  TIMEOUT: 5 * 60 * 1000, // 5 minutes
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  MAX_ACCOUNTS: 10,
} as const;

// Tokens & Pricing (approximate)
export const TOKEN_PRICING = {
  CLAUDE_3_OPUS: {
    input: 15.0 / 1_000_000, // $15 per million tokens
    output: 75.0 / 1_000_000, // $75 per million tokens
  },
  CLAUDE_3_SONNET: {
    input: 3.0 / 1_000_000, // $3 per million tokens
    output: 15.0 / 1_000_000, // $15 per million tokens
  },
  CLAUDE_3_HAIKU: {
    input: 0.25 / 1_000_000, // $0.25 per million tokens
    output: 1.25 / 1_000_000, // $1.25 per million tokens
  },
} as const;

// File upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    "text/plain",
    "text/markdown",
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "application/json",
    "application/xml",
    "text/html",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/typescript",
    "text/x-python",
    "text/x-java",
    "text/x-c",
    "text/x-c++",
    "text/x-go",
    "text/x-rust",
    "text/x-php",
    "text/x-ruby",
  ],
} as const;

// Export/Import
export const EXPORT_FORMATS = ["json", "txt", "md", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export const IMPORT_FORMATS = ["json", "txt", "md"] as const;
export type ImportFormat = (typeof IMPORT_FORMATS)[number];

// Commands
export const COMMANDS = {
  MAIN: [
    { command: "chat", description: "Start chat with Claude" },
    { command: "login", description: "Add new account" },
    { command: "accounts", description: "Manage accounts" },
    { command: "settings", description: "Change settings" },
    { command: "help", description: "Show help" },
    { command: "exit", description: "Exit application" },
  ],
  CHAT: [
    { command: "/exit", description: "Exit chat and return to main menu" },
    { command: "/quit", description: "Same as /exit" },
    { command: "/clear", description: "Clear conversation history" },
    { command: "/new", description: "Start a new conversation" },
    { command: "/help", description: "Show available commands" },
    { command: "/export", description: "Export conversation to file" },
    { command: "/context", description: "Show current context usage" },
    { command: "/cost", description: "Show token usage and estimated cost" },
    { command: "/models", description: "List available models" },
    { command: "/switch", description: "Switch to different model" },
  ],
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  GLOBAL: {
    "Ctrl+C": "Exit application",
    "Ctrl+L": "Clear screen",
    "Ctrl+R": "Refresh",
    "Ctrl+U": "Clear input",
    "Ctrl+A": "Select all",
    "Ctrl+E": "Go to end of line",
    "Ctrl+B": "Go to beginning of line",
    "Ctrl+K": "Delete to end of line",
    "Ctrl+W": "Delete previous word",
    Tab: "Auto-complete",
    Escape: "Cancel/Back",
  },
  CHAT: {
    "↑": "Previous message in history",
    "↓": "Next message in history",
    "Ctrl+↑": "Scroll chat up",
    "Ctrl+↓": "Scroll chat down",
    PageUp: "Scroll chat up one page",
    PageDown: "Scroll chat down one page",
    "Shift+Enter": "New line in input",
  },
} as const;

// Error codes
export const ERROR_CODES = {
  AUTH_FAILED: "AUTH_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_REQUEST: "INVALID_REQUEST",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  STORAGE_ERROR: "STORAGE_ERROR",
  FILE_ERROR: "FILE_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

// HTTP Status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_MULTI_ACCOUNT: true,
  ENABLE_FILE_UPLOAD: true,
  ENABLE_STREAMING: true,
  ENABLE_PLUGINS: false, // Coming soon
  ENABLE_THEMES: true,
  ENABLE_AUTO_UPDATE: true,
  ENABLE_BACKUP: true,
  ENABLE_ANALYTICS: false, // Opt-in only
} as const;

// Update check
export const UPDATE_CHECK = {
  INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  URL: "https://api.github.com/repos/yourusername/zencli/releases/latest",
} as const;

// Cache
export const CACHE = {
  TTL: 5 * 60 * 1000, // 5 minutes
  MAX_ITEMS: 100,
  ENABLED: true,
} as const;

// Performance
export const PERFORMANCE = {
  DEBOUNCE_DELAY: 300, // ms
  THROTTLE_DELAY: 100, // ms
  MAX_CONCURRENT_REQUESTS: 3,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
} as const;

// Security
export const SECURITY = {
  ENCRYPT_STORAGE: false, // Coming soon
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  CLEAR_CLIPBOARD_DELAY: 30 * 1000, // 30 seconds
  LOG_SENSITIVE_DATA: false,
  ALLOWED_ORIGINS: ["http://localhost:3000", "http://127.0.0.1:3000"],
} as const;

// Paths
export const PATHS = {
  CONFIG_DIR: ".config/zencli",
  LOGS_DIR: "logs",
  BACKUP_DIR: "backups",
  PLUGINS_DIR: "plugins",
  THEMES_DIR: "themes",
} as const;

// Environment
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "production",
  DEBUG: process.env.DEBUG === "true",
  CI: process.env.CI === "true",
  TEST: process.env.TEST === "true",
} as const;

// Analytics events
export const ANALYTICS_EVENTS = {
  APP_STARTED: "app_started",
  APP_CLOSED: "app_closed",
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  CHAT_STARTED: "chat_started",
  CHAT_COMPLETED: "chat_completed",
  MESSAGE_SENT: "message_sent",
  FILE_UPLOADED: "file_uploaded",
  SETTINGS_CHANGED: "settings_changed",
  ACCOUNT_SWITCHED: "account_switched",
  ERROR_OCCURRED: "error_occurred",
} as const;

// Date/Time formats
export const DATE_FORMATS = {
  ISO: "YYYY-MM-DDTHH:mm:ss.sssZ",
  DISPLAY: "DD/MM/YYYY HH:mm:ss",
  SHORT: "DD/MM HH:mm",
  TIME_ONLY: "HH:mm:ss",
} as const;

// Colors
export const COLORS = {
  PRIMARY: "#007AFF",
  SECONDARY: "#5856D6",
  SUCCESS: "#34C759",
  WARNING: "#FF9500",
  ERROR: "#FF3B30",
  INFO: "#5AC8FA",
  DARK_BG: "#1C1C1E",
  LIGHT_BG: "#F2F2F7",
  DARK_TEXT: "#FFFFFF",
  LIGHT_TEXT: "#000000",
  GRAY: "#8E8E93",
} as const;

// Symbols/Emojis
export const SYMBOLS = {
  CHECK: "✅",
  CROSS: "❌",
  WARNING: "⚠️",
  INFO: "ℹ️",
  ARROW_RIGHT: "→",
  ARROW_LEFT: "←",
  BULLET: "•",
  LOADING: "⏳",
  USER: "👤",
  BOT: "🤖",
  KEY: "🔑",
  EMAIL: "📧",
  FOLDER: "📁",
  FILE: "📄",
  SETTINGS: "⚙️",
  HELP: "📖",
  EXIT: "🚪",
  CHAT: "💬",
  ACCOUNT: "👥",
  LOCK: "🔐",
  UNLOCK: "🔓",
  SEARCH: "🔍",
  DOWNLOAD: "📥",
  UPLOAD: "📤",
  TRASH: "🗑️",
  STAR: "⭐",
  HEART: "❤️",
  FIRE: "🔥",
  ROCKET: "🚀",
  ZAP: "⚡",
  GLOBE: "🌐",
  CALENDAR: "📅",
  CLOCK: "🕒",
  BELL: "🔔",
  MEGAPHONE: "📢",
  LIGHTBULB: "💡",
} as const;

// Default values
export const DEFAULTS = {
  MODEL: DEFAULT_MODEL,
  THEME: DEFAULT_THEME,
  PORT: DEFAULT_SERVER_PORT,
  LOG_LEVEL: DEFAULT_LOG_LEVEL,
  MAX_CONVERSATIONS: UI.MAX_CONVERSATIONS,
  AUTO_COMPLETE: true,
  SYNTAX_HIGHLIGHTING: true,
  WORD_WRAP: true,
  FONT_SIZE: 14,
  FONT_FAMILY: "'Menlo', 'Monaco', 'Courier New', monospace",
  SHOW_LINE_NUMBERS: true,
  ANIMATIONS: true,
  PROGRESS_BARS: true,
  CONFIRM_EXIT: true,
  AUTO_CLEAR: false,
  COLOR_SCHEME: "auto",
} as const;
