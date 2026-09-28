/**
 * ------------------------------------------------------------------
 * Global Storage Manager (Terminal Edition)
 * ------------------------------------------------------------------
 * Key-value storage dựa trên file JSON, thay thế vscode.workspace.fs
 * bằng Node.js fs/promises. Giữ nguyên cache logic và key encoding
 * từ bản Zen gốc.
 *
 * Khác biệt so với bản VSCode:
 * - Constructor nhận storageDir string thay vì ExtensionContext
 * - Dùng fs/promises thay vì vscode.workspace.fs
 * - Không có migrateFromGlobalState (không có globalState trong CLI)
 * ------------------------------------------------------------------
 */

import * as fs from "fs";
import * as path from "path";

export class GlobalStorageManager {
  private readonly storageDir: string;
  private _listCache: Map<string, { result: string[]; timestamp: number }> =
    new Map();
  private readonly LIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private _getCache: Map<string, { value: string; timestamp: number }> =
    new Map();
  private readonly GET_CACHE_TTL = 2000; // 2 seconds

  constructor(storageDir: string) {
    this.storageDir = storageDir;
  }

  /** Tạo thư mục storage nếu chưa tồn tại */
  async initialize(): Promise<void> {
    try {
      await fs.promises.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      // Directory may already exist — safe to ignore
    }
  }

  /** Encode key thành filename an toàn (Base64) */
  private keyToFilename(key: string): string {
    return Buffer.from(key).toString("base64") + ".json";
  }

  /** Decode filename về key gốc */
  private filenameToKey(filename: string): string {
    const base = path.basename(filename, ".json");
    return Buffer.from(base, "base64").toString("utf8");
  }

  private getKeyPath(key: string): string {
    return path.join(this.storageDir, this.keyToFilename(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.promises.access(this.getKeyPath(key));
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | undefined> {
    // Check cache first
    const cached = this._getCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.GET_CACHE_TTL) {
      return cached.value;
    }

    if (!(await this.exists(key))) {
      return undefined;
    }

    try {
      const content = await fs.promises.readFile(this.getKeyPath(key), "utf-8");

      // Store in cache
      this._getCache.set(key, { value: content, timestamp: Date.now() });

      return content;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: string): Promise<void> {
    const filePath = this.getKeyPath(key);
    await fs.promises.writeFile(filePath, value, "utf-8");

    // Invalidate cache for this key
    this._getCache.delete(key);
    this._listCache.clear();
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.promises.unlink(this.getKeyPath(key));

      // Invalidate cache
      this._getCache.delete(key);
      this._listCache.clear();
    } catch {
      // Ignore if file doesn't exist
    }
  }

  async list(prefix?: string): Promise<string[]> {
    const cacheKey = prefix || "all";
    const cached = this._listCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.LIST_CACHE_TTL) {
      return cached.result;
    }

    try {
      const entries = await fs.promises.readdir(this.storageDir);
      const keys = entries
        .filter((name) => name.endsWith(".json"))
        .map((name) => this.filenameToKey(name));

      const result = prefix
        ? keys.filter((key) => key.startsWith(prefix))
        : keys;

      this._listCache.set(cacheKey, { result, timestamp: Date.now() });

      return result;
    } catch {
      return [];
    }
  }

  /**
   * Tìm toolOutputs cho một conversation bằng cách quét tất cả key zen-chat
   * khớp với conversationId.
   * Key format: zen-chat:<tabId>:<folderPath>:<conversationId>
   */
  async getToolOutputsForConversation(
    conversationId: string,
  ): Promise<
    | Record<string, { output: string; isError: boolean; terminalId?: string }>
    | undefined
  > {
    try {
      const allKeys = await this.list("zen-chat:");
      const matchingKeys = allKeys.filter((k) =>
        k.endsWith(`:${conversationId}`),
      );

      for (const key of matchingKeys) {
        const raw = await this.get(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (
            parsed.toolOutputs &&
            Object.keys(parsed.toolOutputs).length > 0
          ) {
            return parsed.toolOutputs;
          }
        } catch {
          // Skip invalid JSON
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
}