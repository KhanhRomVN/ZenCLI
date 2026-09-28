/**
 * ------------------------------------------------------------------
 * Terminal Manager (Terminal Edition)
 * ------------------------------------------------------------------
 * Quản lý terminal: tạo, chạy lệnh shell, pipe stdin/stdout,
 * throttle data, auto-cleanup. Phát hiện lệnh long-running
 * (dev/start/serve/watch...).
 *
 * Khác biệt so với bản VSCode:
 * - Thay vscode.EventEmitter bằng Node.js EventEmitter
 * - Không có vscode.Terminal UI — output trả về qua event/callback
 * - Giữ nguyên logic spawn/kill/output capture/throttle
 * ------------------------------------------------------------------
 */

import { EventEmitter } from "events";
import { ChildProcess, spawn, SpawnOptions, execSync } from "child_process";
import * as crypto from "crypto";
import * as os from "os";

const LONG_RUNNING_PATTERNS =
  /\b(dev|start|serve|watch|preview|run dev|run start|run serve|run watch|run preview)\b/i;

const MAX_OUTPUT = 1 * 1024 * 1024; // 1 MB cap

// ─── Interfaces ─────────────────────────────────────────────────────────

export interface CommandFinishedEvent {
  actionId: string;
  output: string;
  terminalId: string;
  commandText?: string;
  exitCode?: number | null;
}

export interface DataWrittenEvent {
  terminalId: string;
  data: string;
}

export interface TerminalStatusChangedEvent {
  terminalId: string;
  status: "busy" | "free";
}

interface TerminalEntry {
  process: ChildProcess | null;
  cwd: string;
  name: string;
  isBusy: boolean;
  output: string;
  activeActionId: string | null;
  isLongRunning: boolean;
  commandText: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function resolveShell(cwd: string): {
  shell: string;
  shellArgs: string[];
  spawnOpts: SpawnOptions;
} {
  const platform = os.platform();

  if (platform === "win32") {
    const comspec = process.env.COMSPEC || "cmd.exe";
    return {
      shell: comspec,
      shellArgs: ["/d", "/s", "/c"],
      spawnOpts: {
        cwd,
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      },
    };
  }

  // macOS / Linux
  const userShell = process.env.SHELL || "/bin/sh";
  return {
    shell: userShell,
    shellArgs: ["-c"],
    spawnOpts: {
      cwd,
      env: { ...process.env, TERM: "dumb", NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    },
  };
}

// ─── Class ──────────────────────────────────────────────────────────────

export class TerminalManager extends EventEmitter {
  private terminalMap = new Map<string, TerminalEntry>();

  // Throttle terminal data events to reduce overhead
  private dataBuffers = new Map<
    string,
    { data: string; timer: NodeJS.Timeout | null }
  >();
  private readonly DATA_FLUSH_INTERVAL = 100; // ms

  constructor() {
    super();
  }

  /**
   * Events emitted:
   * - 'commandFinished': CommandFinishedEvent
   * - 'dataWritten': DataWrittenEvent
   * - 'statusChanged': TerminalStatusChangedEvent
   */

  findByActionId(actionId: string): string | undefined {
    for (const [id, entry] of this.terminalMap.entries()) {
      if (entry.activeActionId === actionId) {
        return id;
      }
    }
    return undefined;
  }

  private killProcessTree(entry: TerminalEntry): void {
    if (!entry.process) return;
    const pid = entry.process.pid;

    if (pid) {
      if (os.platform() === "win32") {
        try {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
        } catch {
          try {
            entry.process.kill();
          } catch {
            // Process may already be dead
          }
        }
      } else {
        // Linux / macOS: kill all descendants and the parent process
        try {
          process.kill(-pid, "SIGKILL");
        } catch {
          // Process group may not exist
        }
        try {
          execSync(`pkill -KILL -P ${pid} 2>/dev/null || true`, {
            stdio: "ignore",
          });
        } catch {
          // pkill may not be available
        }
        try {
          execSync(`kill -9 ${pid} 2>/dev/null || true`, { stdio: "ignore" });
        } catch {
          // Process may already be dead
        }
        try {
          entry.process.kill("SIGKILL");
        } catch {
          // Process may already be dead
        }
      }
    } else {
      try {
        entry.process.kill();
      } catch {
        // Process may already be dead
      }
    }
    entry.process = null;
  }

  async startInteractive(
    cwd: string,
    terminalId?: string,
  ): Promise<{ id: string; name: string }> {
    const id = terminalId || crypto.randomUUID();
    if (this.terminalMap.has(id)) {
      return { id, name: this.terminalMap.get(id)!.name };
    }

    const name = "Zen Terminal";
    const entry: TerminalEntry = {
      process: null,
      cwd,
      name,
      isBusy: false,
      output: "",
      activeActionId: null,
      isLongRunning: false,
      commandText: "",
    };
    this.terminalMap.set(id, entry);

    return { id, name };
  }

  private flushDataBuffer(terminalId: string): void {
    const buffer = this.dataBuffers.get(terminalId);
    if (!buffer || !buffer.data) return;

    this.emit("dataWritten", {
      terminalId,
      data: buffer.data,
    } satisfies DataWrittenEvent);

    buffer.data = "";
    buffer.timer = null;
  }

  private bufferTerminalData(terminalId: string, data: string): void {
    let buffer = this.dataBuffers.get(terminalId);
    if (!buffer) {
      buffer = { data: "", timer: null };
      this.dataBuffers.set(terminalId, buffer);
    }

    buffer.data += data;

    if (buffer.timer) {
      clearTimeout(buffer.timer);
    }

    buffer.timer = setTimeout(() => {
      this.flushDataBuffer(terminalId);
    }, this.DATA_FLUSH_INTERVAL);
  }

  sendInput(id: string, commandText: string, actionId?: string): void {
    const entry = this.terminalMap.get(id);
    if (!entry) {
      return;
    }

    // If a process is running and no actionId, pipe input into its stdin
    if (!actionId && entry.process && entry.isBusy) {
      const input = commandText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      entry.output += input;
      entry.process.stdin?.write(input);
      return;
    }

    if (entry.process) {
      this.killProcessTree(entry);
    }

    const { shell, shellArgs, spawnOpts } = resolveShell(entry.cwd);
    const cleanCmd = commandText.replace(/\r?\n+$/, "");
    const isLongRunning = LONG_RUNNING_PATTERNS.test(cleanCmd);

    entry.isBusy = true;
    entry.activeActionId = actionId || null;
    entry.isLongRunning = isLongRunning;
    entry.commandText = cleanCmd;
    entry.output = "";

    this.emit("statusChanged", {
      terminalId: id,
      status: "busy",
    } satisfies TerminalStatusChangedEvent);

    const child = spawn(shell, [...shellArgs, cleanCmd], spawnOpts);
    entry.process = child;

    const onData = (chunk: Buffer): void => {
      const clean = chunk
        .toString("utf8")
        .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
        .replace(/\x1b\][^\x07]*\x07/g, "");
      entry.output += clean;
      if (entry.output.length > MAX_OUTPUT) {
        entry.output = entry.output.substring(
          entry.output.length - MAX_OUTPUT / 2,
        );
      }
      this.bufferTerminalData(id, clean);
    };

    child.stdout!.on("data", onData);
    child.stderr!.on("data", onData);

    let stdoutEnded = false;
    let stderrEnded = false;
    let processClosed = false;
    let exitCode: number | null = null;

    const tryFinish = (): void => {
      if (!processClosed || !stdoutEnded || !stderrEnded) return;

      // Flush any remaining buffered data before finishing
      this.flushDataBuffer(id);

      entry.process = null;
      entry.isBusy = false;

      if (actionId) {
        entry.activeActionId = null;
        this.emit("commandFinished", {
          actionId,
          output: entry.output,
          terminalId: id,
          commandText: cleanCmd,
          exitCode,
        } satisfies CommandFinishedEvent);
      }

      this.emit("statusChanged", {
        terminalId: id,
        status: "free",
      } satisfies TerminalStatusChangedEvent);

      this._cleanup(id);
    };

    child.stdout!.on("end", () => {
      stdoutEnded = true;
      tryFinish();
    });
    child.stderr!.on("end", () => {
      stderrEnded = true;
      tryFinish();
    });

    child.on("close", (code) => {
      processClosed = true;
      exitCode = code;
      tryFinish();
    });

    child.on("error", (err) => {
      this.flushDataBuffer(id);
      entry.process = null;
      entry.isBusy = false;

      if (actionId) {
        entry.activeActionId = null;
        this.emit("commandFinished", {
          actionId,
          output: err.message,
          terminalId: id,
          commandText: cleanCmd,
        } satisfies CommandFinishedEvent);
      }

      this.emit("statusChanged", {
        terminalId: id,
        status: "free",
      } satisfies TerminalStatusChangedEvent);

      this._cleanup(id);
    });
  }

  private _cleanup(id: string): void {
    const entry = this.terminalMap.get(id);
    if (!entry) return;

    const buffer = this.dataBuffers.get(id);
    if (buffer?.timer) {
      clearTimeout(buffer.timer);
    }
    this.dataBuffers.delete(id);
    this.terminalMap.delete(id);
  }

  close(id: string, notify: boolean = false): void {
    const entry = this.terminalMap.get(id);
    if (!entry) return;

    this.flushDataBuffer(id);
    this.killProcessTree(entry);
    entry.isBusy = false;

    this.emit("statusChanged", {
      terminalId: id,
      status: "free",
    } satisfies TerminalStatusChangedEvent);

    const activeActionId = entry.activeActionId;
    const output = entry.output;
    const commandText = entry.commandText;

    const buffer = this.dataBuffers.get(id);
    if (buffer?.timer) {
      clearTimeout(buffer.timer);
    }
    this.dataBuffers.delete(id);
    this.terminalMap.delete(id);

    if (notify && activeActionId) {
      this.emit("commandFinished", {
        actionId: activeActionId,
        output,
        terminalId: id,
        commandText,
        exitCode: null,
      } satisfies CommandFinishedEvent);
    }
  }

  /** Đóng tất cả terminal */
  closeAll(notify: boolean = false): void {
    for (const id of [...this.terminalMap.keys()]) {
      this.close(id, notify);
    }
  }

  /** Dọn dẹp toàn bộ tài nguyên */
  dispose(): void {
    for (const buffer of this.dataBuffers.values()) {
      if (buffer.timer) {
        clearTimeout(buffer.timer);
      }
    }
    this.dataBuffers.clear();
    this.closeAll(false);
    this.removeAllListeners();
  }
}