/**
 * ------------------------------------------------------------------
 * Model & Account Selector
 * ------------------------------------------------------------------
 * Wizard ba bước để lựa chọn Provider -> Model -> Account trong giao diện CLI.
 * Hỗ trợ điều hướng bằng bàn phím và hiển thị thông tin chi tiết của từng mục.
 *
 * Main features:
 * - Bước 1: Chọn nhà cung cấp AI (Provider)
 * - Bước 2: Chọn mô hình (Model) và mức độ nỗ lực (Effort Level) nếu có
 * - Bước 3: Chọn tài khoản đăng nhập (Account) tương ứng
 * - Hiển thị mô tả ngắn gọn: Context length, tính năng đặc biệt, quota...
 * - Phím tắt: Enter để xác nhận/chuyển bước, Esc/Ctrl+C để quay lui/hủy
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ─
import React, { useState, useEffect } from "react";

// ── UI ──
import { Box, Text, useInput } from "ink";

// ── Services ──
import {
  fetchProviders,
  fetchAccounts,
  type Provider,
  type Account,
} from "../services/api.js";
import { logToFile } from "../services/logger.js";
// ─── Types & Interfaces ────────────────────────────────────────────────
interface ModelAccountProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selection: {
    providerId: string;
    modelId: string;
    accountId?: string;
    email?: string;
    sessionOnly?: boolean;
  }) => void;
}

type Step = "provider" | "model" | "account";

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
type EffortLevel = (typeof EFFORT_LEVELS)[number];

// ─── Helpers ────────────────────────────────────────────────────────────
function splitModelAndEffort(modelId: string): {
  base: string;
  effort: EffortLevel | null;
} {
  for (const lvl of EFFORT_LEVELS) {
    if (modelId.endsWith(`-${lvl}`)) {
      return { base: modelId.slice(0, -(lvl.length + 1)), effort: lvl };
    }
  }
  return { base: modelId, effort: null };
}

/**
 * Trả về mô tả ngắn cho từng item tùy theo step,
 * lấy cảm hứng từ UI Zen (ProviderModelDrawer).
 */
function getItemDescription(step: Step, item: unknown): string {
  if (step === "provider") {
    const p = item as Provider;
    const modelCount = p.models?.length ?? 0;
    const website = p.website ? new URL(p.website).hostname : "";
    return [`${modelCount} model${modelCount !== 1 ? "s" : ""}`, website]
      .filter(Boolean)
      .join(" · ");
  }
  if (step === "model") {
    const m = item as any;
    const parts: string[] = [];
    if (m.max_context_length != null) {
      const ctx =
        m.max_context_length >= 1_000_000
          ? `${(m.max_context_length / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
          : m.max_context_length >= 1_000
            ? `${Math.round(m.max_context_length / 1_000)}K`
            : String(m.max_context_length);
      parts.push(`${ctx} ctx`);
    }
    if (m.is_thinking) parts.push("Thinking");
    if (m.is_search) parts.push("Search");
    if (m.is_image_upload) parts.push("Image");
    if (m.is_video_upload) parts.push("Video");
    if (m.is_deep_research) parts.push("Research");
    if (m.success_rate != null) parts.push(`${m.success_rate.toFixed(0)}% ok`);
    return parts.length > 0 ? parts.join(" · ") : m.description || "No details";
  }
  // account
  const a = item as Account;
  const parts: string[] = [];
  if (a.period_requests != null)
    parts.push(`${a.period_requests.toLocaleString()} req`);
  if (a.period_tokens != null) {
    const t =
      a.period_tokens >= 1_000_000
        ? `${(a.period_tokens / 1_000_000).toFixed(1)}M`
        : a.period_tokens >= 1_000
          ? `${(a.period_tokens / 1_000).toFixed(1)}k`
          : String(a.period_tokens);
    parts.push(`${t} tokens`);
  }
  if (a.auth_method) parts.push(a.auth_method);
  return parts.length > 0 ? parts.join(" · ") : a.email || a.name || "No info";
}

// ─── Constants ──────────────────────────────────────────────────────────
const STEP_DESCRIPTIONS: Record<Step, string> = {
  provider: "Choose an AI provider to use for this session.",
  model: "Pick a model from the selected provider.",
  account: "Select which account credentials to authenticate with.",
};

// ─── Component ──────────────────────────────────────────────────────────
/**
 * Three-step wizard for selecting provider → model → account.
 * Uses Ink's useInput for keyboard navigation in terminal.
 */
export function ModelAccount({
  isOpen,
  onClose,
  onSelect,
}: ModelAccountProps): React.JSX.Element | null {
  // ── State ──
  const [step, setStep] = useState<Step>("provider");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [effortOptions, setEffortOptions] = useState<EffortLevel[]>([]);
  const [effortIndex, setEffortIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState<{
    id: string;
    provider_id: string;
  } | null>(null);

  // ── Effects ─
  // Fetch providers on mount
  useEffect(() => {
    logToFile(`[DEBUG][ModelAccount.Effect] isOpen=${isOpen}, triggering effect`);
    if (!isOpen) return;
    logToFile("[DEBUG][ModelAccount] Mounting - fetching providers");
    setLoading(true);
    fetchProviders()
      .then((data) => {
        const enabled = data.filter((p) => p.is_enabled);
        logToFile(`[DEBUG][ModelAccount] Providers fetched: total=${data.length}, enabled=${enabled.length}`);
        setProviders(enabled);
      })
      .catch((err) => {
        logToFile(`[ERROR][ModelAccount] Failed to fetch providers: ${err.message}`);
        setProviders([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  // Fetch accounts when model is selected
  useEffect(() => {
    if (step === "account" && selectedProvider) {
      logToFile(`[DEBUG][ModelAccount] Fetching accounts for provider: ${selectedProvider.provider_id}`);
      setLoading(true);
      fetchAccounts({ providerId: selectedProvider.provider_id })
        .then((resp) => {
          const data = resp.accounts || [];
          // Backend có thể không trả field is_enabled; coi là enabled nếu field vắng mặt hoặc truthy
          const isEnabled = (a: Account): boolean =>
            a.is_enabled === undefined ? true : Boolean(a.is_enabled);

          const filtered = data.filter(isEnabled);
          logToFile(`[DEBUG][ModelAccount] Accounts fetched: total=${data.length}, enabled=${filtered.length}`);
          setAccounts(filtered);
        })
        .catch((err) => {
          logToFile(`[ERROR][ModelAccount] Failed to fetch accounts: ${err.message}`);
          setAccounts([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [step, selectedProvider]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setStep("provider");
      setSelectedProvider(null);
      setAccounts([]);
      setCursorIndex(0);
      setEffortOptions([]);
      setEffortIndex(0);
      setSelectedModel(null);
    }
  }, [isOpen]);

  // ── Callbacks ──
  const submitSelection = (sessionOnly: boolean) => {
    if (!selectedProvider || !selectedModel) {
      logToFile(`[WARN][ModelAccount] Submit skipped: missing provider or model`);
      return;
    }
    const selectedAccount = accounts[cursorIndex];
    logToFile(`[DEBUG][ModelAccount] Submitting selection: provider=${selectedProvider.provider_id}, model=${selectedModel.id}, account=${selectedAccount?.id ?? 'none'}, sessionOnly=${sessionOnly}`);
    onSelect({
      providerId: selectedProvider.provider_id,
      modelId: selectedModel.id,
      accountId: selectedAccount?.id,
      email: selectedAccount?.email,
      sessionOnly,
    });
  };

  // ── Handlers ──
  // Keyboard navigation
  useInput((input, key) => {
    if (!isOpen) return;

    // Esc / Ctrl+C: cùng hành vi — quay lại step trước hoặc đóng panel
    const isCancelKey = key.escape || (input === "c" && key.ctrl);
    if (isCancelKey) {
      if (step === "account") {
        setStep("model");
        setCursorIndex(0);
      } else if (step === "model") {
        setStep("provider");
        setCursorIndex(0);
        setEffortOptions([]);
        setSelectedModel(null);
      } else {
        onClose();
      }
      return;
    }

    if (step === "model" && effortOptions.length > 0) {
      if (key.leftArrow) {
        setEffortIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.rightArrow) {
        setEffortIndex((prev) => Math.min(effortOptions.length - 1, prev + 1));
        return;
      }
      if (key.return) {
        const effort = effortOptions[effortIndex];
        const finalId = `${selectedModel?.id}-${effort}`;
        setSelectedModel((prev) => (prev ? { ...prev, id: finalId } : prev));
        setEffortOptions([]);
        setStep("account");
        setCursorIndex(0);
        return;
      }
      if (input === "s") {
        const effort = effortOptions[effortIndex];
        const finalId = `${selectedModel?.id}-${effort}`;
        setSelectedModel((prev) => (prev ? { ...prev, id: finalId } : prev));
        setEffortOptions([]);
        submitSelection(true);
        return;
      }
      return;
    }

    if (key.upArrow) {
      setCursorIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      const maxIndex =
        step === "provider"
          ? providers.length - 1
          : step === "model"
            ? (selectedProvider?.models.length || 0) - 1
            : accounts.length - 1;
      setCursorIndex((prev) => Math.min(maxIndex, prev + 1));
      return;
    }

    if (key.return) {
      if (step === "provider" && providers[cursorIndex]) {
        logToFile(`[DEBUG][ModelAccount] Selected provider: ${providers[cursorIndex].provider_id}`);
        setSelectedProvider(providers[cursorIndex]);
        setStep("model");
        setCursorIndex(0);
      } else if (step === "model" && selectedProvider?.models[cursorIndex]) {
        logToFile(`[DEBUG][ModelAccount] Selected model index: ${cursorIndex}, id: ${selectedProvider.models[cursorIndex].id}`);
        const model = selectedProvider.models[cursorIndex];
        const { base, effort } = splitModelAndEffort(model.id);
        const uniqueEfforts = Array.from(
          new Set(
            selectedProvider.models
              .map((m) => splitModelAndEffort(m.id))
              .filter(
                (parsed) => parsed.base === base && parsed.effort !== null,
              )
              .map((parsed) => parsed.effort as EffortLevel),
          ),
        ).sort((a, b) => EFFORT_LEVELS.indexOf(a) - EFFORT_LEVELS.indexOf(b));

        setSelectedModel({
          id: base,
          provider_id: selectedProvider.provider_id,
        });

        if (uniqueEfforts.length > 1) {
          setEffortOptions(uniqueEfforts);
          setEffortIndex(
            Math.max(0, uniqueEfforts.indexOf(effort ?? "medium")),
          );
          return;
        }

        const finalId = effort ? `${base}-${effort}` : base;
        setSelectedModel({
          id: finalId,
          provider_id: selectedProvider.provider_id,
        });
        setStep("account");
        setCursorIndex(0);
      } else if (step === "account") {
        submitSelection(false);
      }
      return;
    }

    if (input === "s" && step === "account") {
      submitSelection(true);
    }
  });

  if (!isOpen) return null;

  // ── Derived ──
  const currentItems =
    step === "provider"
      ? providers
      : step === "model"
        ? (selectedProvider?.models ?? [])
        : accounts;

  const title =
    step === "provider"
      ? "Select Provider"
      : step === "model"
        ? `Select Model (${selectedProvider?.provider_name ?? ""})`
        : "Select Account";

  const showEffortBar = step === "model" && effortOptions.length > 0;
  const activeEffort = effortOptions[effortIndex];

  const isItemActive = (item: unknown, index: number): boolean => {
    if (step === "provider" && selectedProvider) {
      return (item as Provider).provider_id === selectedProvider.provider_id;
    }
    if (step === "model" && selectedModel) {
      const modelId = (item as any).id;
      const { base } = splitModelAndEffort(modelId ?? "");
      return base === selectedModel.id;
    }
    if (step === "account" && accounts[index]) {
      // account step chưa có khái niệm "đã chọn trước đó", giữ false để tránh highlight nhầm
      return false;
    }
    return false;
  };

  const footerText =
    step === "provider"
      ? "Enter to set as default · Esc or Ctrl+C to cancel"
      : step === "model"
        ? "Enter to set as default · Esc or Ctrl+C to return provider"
        : "Enter to set as default · Esc or Ctrl+C to return model";

  // ── Render ─
  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        <Box flexDirection="column">
          <Text bold color="yellow">
            {title}
          </Text>
          <Text dimColor>{STEP_DESCRIPTIONS[step]}</Text>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {currentItems.map((item, i) => {
            const label =
              step === "account"
                ? (item as Account).email ||
                  (item as Account).name ||
                  (item as any).id ||
                  ""
                : (item as any).name ||
                  (item as any).provider_name ||
                  (item as any).id ||
                  (item as any).provider_id ||
                  "";
            const description = getItemDescription(step, item);
            const isActiveCursor = i === cursorIndex;
            const isActiveSelection = isItemActive(item, i);
            const labelColor = isActiveCursor
              ? "cyan"
              : isActiveSelection
                ? "green"
                : undefined;
            const descColor = isActiveCursor
              ? "cyan"
              : isActiveSelection
                ? "green"
                : "gray";
            return (
              <Box key={(item as any).id || (item as any).provider_id || i}>
                <Box width={4}>
                  <Text color={isActiveCursor ? "cyan" : undefined}>
                    {isActiveCursor ? "❯" : ""}
                  </Text>
                </Box>
                <Box width={30}>
                  <Text color={labelColor} wrap="truncate-end">
                    {label}
                  </Text>
                </Box>
                <Text color={descColor}>{description}</Text>
              </Box>
            );
          })}
          {currentItems.length === 0 && !loading && (
            <Text dimColor>No items available</Text>
          )}
          {loading && <Text dimColor>Loading...</Text>}
        </Box>
        {showEffortBar && activeEffort && (
          <Box marginTop={1}>
            <Text>{`○ ${activeEffort} effort ←/→ to adjust`}</Text>
          </Box>
        )}
      </Box>
      <Box marginTop={1} paddingX={1}>
        <Text dimColor>{footerText}</Text>
      </Box>
    </Box>
  );
}
