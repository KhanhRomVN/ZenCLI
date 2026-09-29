import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  fetchProviders,
  fetchAccounts,
  logToFile,
  type Provider,
  type Account,
} from "../services/api";

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

function splitModelAndEffort(modelId: string): { base: string; effort: EffortLevel | null } {
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
      const ctx = m.max_context_length >= 1_000_000
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
    return parts.length > 0 ? parts.join(" · ") : (m.description || "No details");
  }
  // account
  const a = item as Account;
  const parts: string[] = [];
  if (a.period_requests != null) parts.push(`${a.period_requests.toLocaleString()} req`);
  if (a.period_tokens != null) {
    const t = a.period_tokens >= 1_000_000
      ? `${(a.period_tokens / 1_000_000).toFixed(1)}M`
      : a.period_tokens >= 1_000
        ? `${(a.period_tokens / 1_000).toFixed(1)}k`
        : String(a.period_tokens);
    parts.push(`${t} tokens`);
  }
  if (a.auth_method) parts.push(a.auth_method);
  return parts.length > 0 ? parts.join(" · ") : (a.email || a.name || "No info");
}

const STEP_DESCRIPTIONS: Record<Step, string> = {
  provider: "Choose an AI provider to use for this session.",
  model: "Pick a model from the selected provider.",
  account: "Select which account credentials to authenticate with.",
};

/**
 * Three-step wizard for selecting provider → model → account.
 * Uses Ink's useInput for keyboard navigation in terminal.
 */
export function ModelAccount({
  isOpen,
  onClose,
  onSelect,
}: ModelAccountProps): React.JSX.Element | null {
  const [step, setStep] = useState<Step>("provider");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [effortOptions, setEffortOptions] = useState<EffortLevel[]>([]);
  const [effortIndex, setEffortIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState<{ id: string; provider_id: string } | null>(null);

  // Fetch providers on mount
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchProviders()
      .then((data) => {
        setProviders(data.filter((p) => p.is_enabled));
      })
      .catch(() => {
        setProviders([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  // Fetch accounts when model is selected
  useEffect(() => {
    logToFile(`ModelAccount useEffect[accounts]: step=${step}, selectedProvider=${selectedProvider?.provider_id ?? "(null)"}, accounts.length=${accounts.length}`);

    if (step === "account" && selectedProvider) {
      setLoading(true);
      fetchAccounts(selectedProvider.provider_id)
        .then((data) => {
          // Backend có thể không trả field is_enabled; coi là enabled nếu field vắng mặt hoặc truthy
          const isEnabled = (a: Account): boolean =>
            a.is_enabled === undefined ? true : Boolean(a.is_enabled);

          const filtered = data.filter(isEnabled);
          logToFile(`ModelAccount accounts raw count=${data.length}, after is_enabled filter=${filtered.length}, sample=${JSON.stringify(data.slice(0, 2)).slice(0, 500)}`);

          setAccounts(filtered);
        })
        .catch(() => {
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

  const submitSelection = (sessionOnly: boolean) => {
    if (!selectedProvider || !selectedModel) return;
    const selectedAccount = accounts[cursorIndex];
    onSelect({
      providerId: selectedProvider.provider_id,
      modelId: selectedModel.id,
      accountId: selectedAccount?.id,
      email: selectedAccount?.email,
      sessionOnly,
    });
  };

  // Keyboard navigation
  useInput((input, key) => {
    if (!isOpen) return;

    logToFile(`ModelAccount useInput: input=${JSON.stringify(input)}, escape=${key.escape}, return=${key.return}, step=${step}, cursorIndex=${cursorIndex}`);

    if (key.escape) {
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
        setSelectedProvider(providers[cursorIndex]);
        setStep("model");
        setCursorIndex(0);
      } else if (step === "model" && selectedProvider?.models[cursorIndex]) {
        const model = selectedProvider.models[cursorIndex];
        const { base, effort } = splitModelAndEffort(model.id);
        const uniqueEfforts = Array.from(
          new Set(
            selectedProvider.models
              .map((m) => splitModelAndEffort(m.id))
              .filter((parsed) => parsed.base === base && parsed.effort !== null)
              .map((parsed) => parsed.effort as EffortLevel),
          ),
        ).sort(
          (a, b) => EFFORT_LEVELS.indexOf(a) - EFFORT_LEVELS.indexOf(b),
        );

        setSelectedModel({ id: base, provider_id: selectedProvider.provider_id });

        if (uniqueEfforts.length > 1) {
          setEffortOptions(uniqueEfforts);
          setEffortIndex(Math.max(0, uniqueEfforts.indexOf(effort ?? "medium")));
          return;
        }

        const finalId = effort ? `${base}-${effort}` : base;
        setSelectedModel({ id: finalId, provider_id: selectedProvider.provider_id });
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

  const currentItems =
    step === "provider"
      ? providers
      : step === "model"
        ? selectedProvider?.models ?? []
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
      ? "Enter to set as default · Esc to cancel"
      : step === "model"
        ? "Enter to set as default · Esc to return provider"
        : "Enter to set as default · Esc to return model";

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="column" width="100%">
          <Box borderStyle="single" borderColor="gray" borderBottom={false} borderLeft={false} borderRight={false} width="100%" />
          <Box paddingX={1} flexDirection="column">
            <Text bold color="yellow">
              {title}
            </Text>
            <Text dimColor>{STEP_DESCRIPTIONS[step]}</Text>
          </Box>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {currentItems.map((item, i) => {
            const label =
              step === "account"
                ? (item as Account).email || (item as Account).name || (item as any).id || ""
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
                  <Text color={labelColor} wrap="truncate-end">{label}</Text>
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
