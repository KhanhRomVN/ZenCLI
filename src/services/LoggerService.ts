/**
 * ------------------------------------------------------------------
 * Logger Service (Terminal Edition)
 * ------------------------------------------------------------------
 * Ghi log ra stderr để không làm nhiễu stdout (stdout dành cho Ink UI).
 * Hỗ trợ 4 mức: DEBUG, INFO, WARN, ERROR.
 *
 * Trong ZenCLI, OutputChannel của VSCode được thay bằng stderr vì:
 * - stdout bị Ink chiếm dụng để render TUI
 * - stderr vẫn hiển thị trên terminal mà không ảnh hưởng UI
 * - Có thể redirect riêng biệt khi cần debug
 * ------------------------------------------------------------------
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class LoggerService {
  private static instance: LoggerService;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /** Thay đổi log level runtime (ví dụ: bật DEBUG khi cần troubleshoot) */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const formattedMessage = `[${timestamp}] [${levelName}] ${message}`;

    // Write to stderr so it doesn't interfere with Ink's stdout rendering
    process.stderr.write(formattedMessage + "\n");

    for (const arg of args) {
      if (arg instanceof Error) {
        process.stderr.write((arg.stack || arg.message) + "\n");
      } else if (typeof arg === "object") {
        try {
          process.stderr.write(JSON.stringify(arg, null, 2) + "\n");
        } catch {
          process.stderr.write(String(arg) + "\n");
        }
      } else {
        process.stderr.write(String(arg) + "\n");
      }
    }
  }
}