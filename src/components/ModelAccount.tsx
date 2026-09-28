import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  fetchProviders,
  fetchAccounts,
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
  }) => void;
}

type Step = "provider" | "model" | "account";

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
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [loading, setLoading] = useState(false);

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
    if (step === "account" && selectedProvider) {
      setLoading(true);
      fetchAccounts(selectedProvider.provider_id)
        .then((data) => {
          setAccounts(data.filter((a) => a.is_enabled));
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
    }
  }, [isOpen]);

  // Keyboard navigation
  useInput((input, key) => {
    if (!isOpen) return;

    if (key.escape) {
      if (step === "model") {
        setStep("provider");
        setCursorIndex(0);
      } else if (step === "account") {
        setStep("model");
        setCursorIndex(0);
      } else {
        onClose();
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
        setStep("account");
        setCursorIndex(0);
        // Auto-select if no accounts needed
        if (!selectedProvider.models[cursorIndex]) {
          onSelect({
            providerId: selectedProvider.provider_id,
            modelId: model.id,
          });
        }
      } else if (step === "account") {
        const account = accounts[cursorIndex];
        if (selectedProvider && selectedProvider.models[0]) {
          onSelect({
            providerId: selectedProvider.provider_id,
            modelId: selectedProvider.models[0].id,
            accountId: account?.id,
          });
        }
      }
    }
  });

  if (!isOpen) return null;

  const renderList = (
    items: {
      name?: string;
      id?: string;
      provider_id?: string;
      provider_name?: string;
    }[],
    title: string,
  ) => (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="yellow">
        {title}
      </Text>
      <Text dimColor>{"↑↓ navigate · Enter select · Esc back"}</Text>
      <Box flexDirection="column" marginTop={1}>
        {items.map((item, i) => (
          <Box key={item.id || item.provider_id || i}>
            <Text color={i === cursorIndex ? "cyan" : undefined}>
              {i === cursorIndex ? "❯ " : "  "}
            </Text>
            <Text>
              {item.name || item.provider_name || item.id || item.provider_id}
            </Text>
          </Box>
        ))}
        {items.length === 0 && !loading && (
          <Text dimColor>No items available</Text>
        )}
        {loading && <Text dimColor>Loading...</Text>}
      </Box>
    </Box>
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
    >
      {step === "provider" && renderList(providers, "Select Provider")}
      {step === "model" &&
        selectedProvider &&
        renderList(
          selectedProvider.models.map((m) => ({ ...m, name: m.name || m.id })),
          `Select Model (${selectedProvider.provider_name})`,
        )}
      {step === "account" && renderList(accounts, "Select Account")}
    </Box>
  );
}
