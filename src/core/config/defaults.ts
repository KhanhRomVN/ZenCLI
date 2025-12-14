// Default configuration values for ZenCLI
import { Config, UserPreferences } from "../types/index.js";
import { DEFAULT_MODEL, DEFAULT_THEME, DEFAULTS } from "./constants.js";

export const defaultConfig: Config = {
  accounts: [],
  activeAccountId: null,
  defaultModel: DEFAULT_MODEL,
  theme: DEFAULT_THEME,
  enableStreaming: true,
  showTimestamps: true,
  maxConversations: 100,
  tokenUsage: {},
  conversationHistory: [],
  stats: {
    totalConversations: 0,
    totalMessages: 0,
    totalTokens: 0,
    lastActive: Date.now(),
  },
};

export const defaultUserPreferences: UserPreferences = {
  autoComplete: DEFAULTS.AUTO_COMPLETE,
  syntaxHighlighting: DEFAULTS.SYNTAX_HIGHLIGHTING,
  wordWrap: DEFAULTS.WORD_WRAP,
  fontSize: DEFAULTS.FONT_SIZE,
  fontFamily: DEFAULTS.FONT_FAMILY,
  showLineNumbers: DEFAULTS.SHOW_LINE_NUMBERS,
  autoSave: true,
  notifications: true,
  showTimestamp: true,
  editor: "nano",
  language: "en",
};

export const defaultTheme = {
  name: "default",
  type: DEFAULT_THEME,
  colors: {
    primary: "#007AFF",
    secondary: "#5856D6",
    background: DEFAULT_THEME === "dark" ? "#1C1C1E" : "#F2F2F7",
    foreground: DEFAULT_THEME === "dark" ? "#FFFFFF" : "#000000",
    accent: "#5AC8FA",
    muted: "#8E8E93",
    border: DEFAULT_THEME === "dark" ? "#2C2C2E" : "#C7C7CC",
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
    info: "#5AC8FA",
  },
};

export const defaultKeybinds = [
  {
    key: "Ctrl+C",
    action: "exit",
    description: "Exit application",
    global: true,
  },
  { key: "Ctrl+L", action: "clear", description: "Clear screen", global: true },
  {
    key: "Ctrl+R",
    action: "refresh",
    description: "Refresh view",
    global: true,
  },
  {
    key: "Ctrl+U",
    action: "clearInput",
    description: "Clear input",
    global: true,
  },
  {
    key: "Tab",
    action: "autocomplete",
    description: "Auto-complete",
    global: true,
  },
  { key: "Escape", action: "cancel", description: "Cancel/Back", global: true },
  {
    key: "↑",
    action: "prevHistory",
    description: "Previous message",
    chat: true,
  },
  { key: "↓", action: "nextHistory", description: "Next message", chat: true },
  {
    key: "Shift+Enter",
    action: "newLine",
    description: "New line in input",
    chat: true,
  },
];

export const defaultCommands = [
  { name: "chat", description: "Start chat with Claude", category: "chat" },
  { name: "login", description: "Add new account", category: "account" },
  { name: "accounts", description: "Manage accounts", category: "account" },
  { name: "settings", description: "Change settings", category: "system" },
  { name: "help", description: "Show help", category: "system" },
  { name: "version", description: "Show version", category: "system" },
  { name: "server", description: "Start HTTP server", category: "system" },
  { name: "logs", description: "Show logs", category: "system" },
];

export const defaultChatCommands = [
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
];

export const defaultModels = [
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    description: "Most capable model",
    is_default: true,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    description: "Previous generation",
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    description: "Most powerful but slower",
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    description: "Fastest and most affordable",
  },
];

export const defaultNetworkConfig = {
  timeout: 30000,
  retries: 3,
  baseURL: "https://claude.ai",
  userAgent: "ZenCLI/1.0.0",
};

export const defaultUIConfig = {
  showWelcome: true,
  animations: DEFAULTS.ANIMATIONS,
  progressBars: DEFAULTS.PROGRESS_BARS,
  confirmExit: DEFAULTS.CONFIRM_EXIT,
  autoClear: DEFAULTS.AUTO_CLEAR,
  colorScheme: DEFAULTS.COLOR_SCHEME,
};

export const defaultSecurityConfig = {
  encryptStorage: false,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  clearClipboard: true,
  logSensitiveData: false,
};

export const defaultExportOptions = {
  format: "json" as const,
  includeMetadata: true,
  includeTimestamps: true,
};

export const defaultImportOptions = {
  format: "json" as const,
  mergeExisting: true,
  validateBeforeImport: true,
};

export const defaultSearchOptions = {
  query: "",
  searchIn: ["messages", "conversations", "files"] as const,
  limit: 50,
};

export const defaultPaginationOptions = {
  page: 1,
  limit: 20,
  sortBy: "updated" as const,
  sortOrder: "desc" as const,
};

export const defaultStreamingOptions = {
  onText: undefined,
  onComplete: undefined,
  onError: undefined,
  onStart: undefined,
};

export const defaultChatCompletionOptions = {
  temperature: 0.7,
  max_tokens: 4096,
  top_p: 0.9,
  stop_sequences: [],
  streaming: true,
  metadata: {},
};

export const defaultFileUploadOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
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
};

export const defaultNotificationSettings = {
  enabled: true,
  sound: true,
  duration: 5000, // 5 seconds
  position: "top-right" as const,
};

export const defaultBackupSettings = {
  autoBackup: true,
  backupInterval: 24 * 60 * 60 * 1000, // 24 hours
  maxBackups: 30,
  backupLocation: "auto" as const,
};

export const defaultUpdateSettings = {
  autoCheck: true,
  checkInterval: 24 * 60 * 60 * 1000, // 24 hours
  autoDownload: false,
  notify: true,
};

export const defaultAnalyticsSettings = {
  enabled: false,
  anonymize: true,
  optIn: false,
};

export const defaultCacheSettings = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  maxItems: 100,
  clearOnExit: false,
};

export const defaultPerformanceSettings = {
  debounceDelay: 300, // ms
  throttleDelay: 100, // ms
  maxConcurrentRequests: 3,
  retryAttempts: 3,
  retryDelay: 1000, // ms
};

export const defaultPluginSettings = {
  enabled: false,
  autoUpdate: false,
  allowRemote: false,
  sandbox: true,
};

export const defaultThemeSettings = {
  autoSwitch: true,
  preferDark: false,
  customTheme: null,
};

// Export all defaults
export default {
  config: defaultConfig,
  userPreferences: defaultUserPreferences,
  theme: defaultTheme,
  keybinds: defaultKeybinds,
  commands: defaultCommands,
  chatCommands: defaultChatCommands,
  models: defaultModels,
  network: defaultNetworkConfig,
  ui: defaultUIConfig,
  security: defaultSecurityConfig,
  export: defaultExportOptions,
  import: defaultImportOptions,
  search: defaultSearchOptions,
  pagination: defaultPaginationOptions,
  streaming: defaultStreamingOptions,
  chatCompletion: defaultChatCompletionOptions,
  fileUpload: defaultFileUploadOptions,
  notification: defaultNotificationSettings,
  backup: defaultBackupSettings,
  update: defaultUpdateSettings,
  analytics: defaultAnalyticsSettings,
  cache: defaultCacheSettings,
  performance: defaultPerformanceSettings,
  plugin: defaultPluginSettings,
  themeSettings: defaultThemeSettings,
};
