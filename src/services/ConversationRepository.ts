/**
 * ------------------------------------------------------------------
 * ConversationRepository
 * ------------------------------------------------------------------
 * Truy vấn tập trung các conversation đã lưu trong
 * ~/.khanhromvn-zen/projects/{md5(workspacePath)}/.
 *
 * Tách khỏi UI (History.tsx) để ChatService / App.tsx có thể dùng mà
 * không phụ thuộc Ink component.
 *
 * Main functions:
 * - listAll(limit?)          : danh sách sorted desc by lastModified
 * - getLatest(opts?)         : conversation mới nhất, có filter "active"
 * - hasAnyActive()           : check nhanh tồn tại ≥1 active conversation
 * ------------------------------------------------------------------
 */

import * as fs from "fs";
import * as path from "path";
import { PathService } from "./PathService.js";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  messageCount: number;
  /** Số lượng user message thực sự đã gửi (>=1 nghĩa là conversation đã được dùng). */
  userMessageCount: number;
  totalTokens: number;
  providerId?: string;
  modelId?: string;
  sourceEnvironment: "terminal" | "vscode-extension";
}

export interface GetLatestOptions {
  /** Chỉ xét conversation có ít nhất N user message. Mặc định 1. */
  minUserMessages?: number;
  /** Ưu tiên conversation có sourceEnvironment === "terminal". Mặc định true. */
  preferTerminalSource?: boolean;
}

const DEFAULT_MIN_USER_MESSAGES = 1;

export class ConversationRepository {
  private readonly projectDir: string;

  constructor(private readonly workspacePath: string) {
    this.projectDir = PathService.getInstance().getProjectContextDir(workspacePath);
  }

  /** Đọc metadata + đếm user message của một conversation folder. null nếu file lỗi/không tồn tại. */
  private async readOne(conversationId: string): Promise<ConversationSummary | null> {
    const jsonPath = path.join(this.projectDir, conversationId, `${conversationId}.json`);
    if (!fs.existsSync(jsonPath)) return null;

    try {
      const raw = await fs.promises.readFile(jsonPath, "utf-8");
      const parsed = JSON.parse(raw);

      // Hỗ trợ cả 2 format: array thuần hoặc object { metadata, messages }
      const messages: any[] = Array.isArray(parsed) ? parsed : parsed.messages || [];
      const metadata = Array.isArray(parsed) ? null : parsed.metadata || null;

      if (!Array.isArray(messages)) return null;

      const userMessageCount = messages.filter(
        (m) => m && typeof m === "object" && m.role === "user",
      ).length;

      let providerId: string | undefined;
      let modelId: string | undefined;
      const firstAssistant = messages.find((m) => m?.role === "assistant");
      if (firstAssistant) {
        providerId = firstAssistant.providerId || firstAssistant.provider_id;
        modelId = firstAssistant.modelId || firstAssistant.model_id;
      }

      const sourceEnv: "terminal" | "vscode-extension" =
        metadata?.sourceEnvironment === "terminal" ? "terminal" : "vscode-extension";

      return {
        id: conversationId,
        title: metadata?.title || "Untitled",
        createdAt: metadata?.createdAt || 0,
        lastModified: metadata?.lastModified || 0,
        messageCount: messages.length,
        userMessageCount,
        totalTokens: metadata?.totalTokenUsage || 0,
        providerId,
        modelId,
        sourceEnvironment: sourceEnv,
      };
    } catch {
      return null;
    }
  }

  /** Liệt kê toàn bộ conversation trong project, sorted desc by lastModified. */
  async listAll(limit?: number): Promise<ConversationSummary[]> {
    if (!fs.existsSync(this.projectDir)) return [];

    const entries = await fs.promises.readdir(this.projectDir, { withFileTypes: true });
    const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    const results = await Promise.all(ids.map((id) => this.readOne(id)));
    const summaries = results.filter((s): s is ConversationSummary => s !== null);

    summaries.sort((a, b) => b.lastModified - a.lastModified);
    return typeof limit === "number" ? summaries.slice(0, limit) : summaries;
  }

  /**
   * Lấy conversation "đang active" gần nhất — tức là conversation cuối cùng
   * user thực sự đã chat (≥ minUserMessages user turn).
   *
   * Trả về null nếu chưa từng chat trong workspace này.
   */
  async getLatest(opts: GetLatestOptions = {}): Promise<ConversationSummary | null> {
    const minUserMessages = opts.minUserMessages ?? DEFAULT_MIN_USER_MESSAGES;
    const preferTerminal = opts.preferTerminalSource ?? true;

    const all = await this.listAll();

    // Bước 1: lọc theo threshold "đã chat thật"
    const eligible = all.filter((c) => c.userMessageCount >= minUserMessages);
    if (eligible.length === 0) return null;

    // Bước 2: ưu tiên source=terminal nếu bật
    if (preferTerminal) {
      const terminalFirst = eligible.find((c) => c.sourceEnvironment === "terminal");
      if (terminalFirst) return terminalFirst;
    }

    // Fallback: conversation đủ điều kiện mới nhất (đã sorted desc)
    return eligible[0];
  }

  /** Check nhanh: có bất kỳ conversation active nào không? Tránh đọc hết file khi chỉ cần boolean. */
  async hasAnyActive(minUserMessages: number = DEFAULT_MIN_USER_MESSAGES): Promise<boolean> {
    const latest = await this.getLatest({ minUserMessages });
    return latest !== null;
  }
}