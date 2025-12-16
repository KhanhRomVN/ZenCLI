import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// ANSI color codes for terminal colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

export class Logger {
  private static instance: Logger;
  private logFile: string;
  private currentLevel: LogLevel = LogLevel.DEBUG;
  private mode: "cli" | "server" = "cli";

  private constructor() {
    // Log file ở project root
    const projectRoot = path.join(__dirname, "..", "..", "..");
    this.logFile = path.join(projectRoot, "cli_logging.log");
    this.initLogFile();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setMode(mode: "cli" | "server"): void {
    this.mode = mode;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private initLogFile(): void {
    if (this.mode === "server") return;
    try {
      // Clear log file khi start (ghi đè file cũ)
      const header =
        `${colors.bright}${colors.cyan}==================================================\n` +
        `ZenCLI Log File - ${new Date().toISOString()}\n` +
        `==================================================${colors.reset}\n\n`;
      fs.writeFileSync(this.logFile, header, "utf8");
    } catch (error) {
      console.error("Failed to initialize log file:", error);
    }
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return colors.dim + colors.cyan;
      case LogLevel.INFO:
        return colors.blue;
      case LogLevel.WARN:
        return colors.yellow;
      case LogLevel.ERROR:
        return colors.red;
      case LogLevel.FATAL:
        return colors.bgRed + colors.white + colors.bright;
      default:
        return colors.white;
    }
  }

  private getLevelName(level: LogLevel): string {
    return LogLevel[level].padEnd(5);
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    data?: any,
    source?: string
  ): string {
    const timestamp = new Date().toISOString();
    const levelColor = this.getLevelColor(level);
    const levelName = this.getLevelName(level);

    let logLine = `${colors.dim}[${timestamp}]${colors.reset} `;
    logLine += `${levelColor}[${levelName}]${colors.reset} `;

    if (source) {
      logLine += `${colors.magenta}[${source}]${colors.reset} `;
    }

    logLine += `${message}`;

    if (data) {
      logLine += `\n${colors.dim}${JSON.stringify(data, null, 2)}${
        colors.reset
      }`;
    }

    return logLine;
  }

  private writeLog(
    level: LogLevel,
    message: string,
    data?: any,
    source?: string
  ): void {
    const logEntry = this.formatLogEntry(level, message, data, source);

    if (this.mode === "server") {
      console.log(logEntry);
    } else {
      this.writeToFile(logEntry);
    }
  }

  private writeToFile(logEntry: string): void {
    try {
      fs.appendFileSync(this.logFile, logEntry + "\n", "utf8");
    } catch (error) {
      console.error("Failed to write log:", error);
    }
  }

  debug(message: string, data?: any, source?: string): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      this.writeLog(LogLevel.DEBUG, message, data, source);
    }
  }

  info(message: string, data?: any, source?: string): void {
    if (this.currentLevel <= LogLevel.INFO) {
      this.writeLog(LogLevel.INFO, message, data, source);
    }
  }

  warn(message: string, data?: any, source?: string): void {
    if (this.currentLevel <= LogLevel.WARN) {
      this.writeLog(LogLevel.WARN, message, data, source);
    }
  }

  error(message: string, data?: any, source?: string): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      this.writeLog(LogLevel.ERROR, message, data, source);
    }
  }

  fatal(message: string, data?: any, source?: string): void {
    this.writeLog(LogLevel.FATAL, message, data, source);
  }

  getLogPath(): string {
    return path.dirname(this.logFile);
  }

  getLogFile(): string {
    return this.logFile;
  }
}

export const logger = Logger.getInstance();
