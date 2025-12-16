import Conf from "conf";
import { v4 as uuidv4 } from "uuid";
import { Account, ThemeType } from "../types/index.js";
import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_THEME,
  STORAGE_KEYS,
} from "../config/constants.js";
import { defaultModels } from "../config/defaults.js";

// Helper type for Conf schema
type StoreType = {
  [key: string]: any;
};

export class Storage {
  // @ts-ignore
  private store: Conf<StoreType>;

  constructor() {
    // @ts-ignore
    this.store = new Conf<StoreType>({
      projectName: "zencli",
      projectVersion: "1.0.0",
    });
  }

  getDeviceId(): string {
    let deviceId = this.store.get("deviceId") as string;
    if (!deviceId) {
      deviceId = uuidv4();
      this.store.set("deviceId", deviceId);
    }
    return deviceId;
  }

  getAnonymousId(): string {
    let anonymousId = this.store.get("anonymousId") as string;
    if (!anonymousId) {
      anonymousId = uuidv4();
      this.store.set("anonymousId", anonymousId);
    }
    return anonymousId;
  }

  getAccounts(): Account[] {
    return this.store.get("accounts", []) as Account[];
  }

  getAccount(accountId: string): Account | undefined {
    return this.getAccounts().find((acc) => acc.id === accountId);
  }

  saveAccounts(accounts: Account[]): void {
    this.store.set("accounts", accounts);
  }

  getActiveAccount(): Account | null {
    const accounts = this.getAccounts();
    const activeId = this.store.get("activeAccountId") as string;
    return accounts.find((acc) => acc.id === activeId) || null;
  }

  async setActiveAccount(accountId: string): Promise<boolean> {
    const accounts = this.getAccounts();
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return false;
    this.store.set("activeAccountId", accountId);
    return true;
  }

  getTheme(): ThemeType {
    return this.store.get("theme", DEFAULT_THEME) as ThemeType;
  }

  setTheme(theme: ThemeType): void {
    this.store.set("theme", theme);
  }

  getDefaultModel(): string {
    return this.store.get("defaultModel", defaultModels[0].id) as string;
  }

  setDefaultModel(modelId: string): void {
    this.store.set("defaultModel", modelId);
  }

  addAccount(account: Account): void {
    const accounts = this.getAccounts();
    accounts.push(account);
    this.saveAccounts(accounts);
    if (accounts.length === 1) {
      this.setActiveAccount(account.id);
      this.store.set("activeAccountId", account.id);
    }
  }

  removeAccount(accountId: string): boolean {
    const accounts = this.getAccounts();
    const initialLength = accounts.length;
    const newAccounts = accounts.filter((acc) => acc.id !== accountId);

    if (newAccounts.length === initialLength) {
      return false; // No account removed
    }

    this.saveAccounts(newAccounts);

    const active = this.getActiveAccount();
    if (active && active.id === accountId) {
      this.store.delete("activeAccountId");
      if (newAccounts.length > 0) {
        this.store.set("activeAccountId", newAccounts[0].id);
      }
    }
    return true;
  }

  updateTokenUsage(
    accountId: string,
    inputTokens: number,
    outputTokens: number
  ): void {
    const usage = this.store.get("tokenUsage", {}) as Record<
      string,
      { input: number; output: number }
    >;
    const current = usage[accountId] || { input: 0, output: 0 };
    usage[accountId] = {
      input: current.input + inputTokens,
      output: current.output + outputTokens,
    };
    this.store.set("tokenUsage", usage);
  }

  getTokenUsage(accountId: string): { input: number; output: number } {
    const usage = this.store.get("tokenUsage", {}) as Record<
      string,
      { input: number; output: number }
    >;
    return usage[accountId] || { input: 0, output: 0 };
  }

  getConversationHistory(): any[] {
    return this.store.get("conversationHistory", []) as any[];
  }

  addConversationToHistory(conversation: any): void {
    const history = this.getConversationHistory();
    history.unshift(conversation);
    if (history.length > 50) {
      history.pop();
    }
    this.store.set("conversationHistory", history);
  }

  clearConversationHistory(): void {
    this.store.set("conversationHistory", []);
  }

  clear(): void {
    this.store.clear();
  }
}

export const storage = new Storage();
