import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { fetchAccounts, createAccount, deleteAccount, type Account } from "../services/api.js";

interface AccountProps {
  isOpen: boolean;
  onClose: () => void;
}

type Field = "provider" | "email" | "name";

const FIELDS: { id: Field; label: string }[] = [
  { id: "provider", label: "Provider ID" },
  { id: "email", label: "Email" },
  { id: "name", label: "Name (optional)" },
];

/**
 * Account management panel — list, add, delete accounts.
 * Combines account list and add-account form into a single component.
 */
export function Account({
  isOpen,
  onClose,
}: AccountProps): React.JSX.Element | null {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Add form state
  const [currentField, setCurrentField] = useState(0);
  const [values, setValues] = useState({ provider: "", email: "", name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load accounts
  useEffect(() => {
    if (!isOpen || showAddForm) return;
    setLoading(true);
    fetchAccounts()
      .then((data) => {
        setAccounts(data);
      })
      .catch(() => {
        setAccounts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, showAddForm]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setCursorIndex(0);
      setShowAddForm(false);
      setConfirmDelete(null);
      resetForm();
    }
  }, [isOpen]);

  const resetForm = (): void => {
    setCurrentField(0);
    setValues({ provider: "", email: "", name: "" });
    setSubmitting(false);
    setFormError(null);
  };

  const handleAddSubmit = async (): Promise<void> => {
    if (!values.provider || !values.email) {
      setFormError("Provider and email are required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const result = await createAccount({
      provider_id: values.provider,
      email: values.email,
      name: values.name || undefined,
    });
    setSubmitting(false);
    if (result) {
      setShowAddForm(false);
      resetForm();
      fetchAccounts().then(setAccounts).catch(() => {});
    } else {
      setFormError("Failed to create account");
    }
  };

  useInput((input, key) => {
    if (!isOpen) return;

    // --- Add form input handling ---
    if (showAddForm) {
      if (submitting) return;

      if (key.escape) {
        setShowAddForm(false);
        resetForm();
        return;
      }

      if (key.tab || key.return) {
        if (currentField < FIELDS.length - 1) {
          setCurrentField((prev) => prev + 1);
        } else {
          handleAddSubmit();
        }
        return;
      }

      if (key.backspace || key.delete) {
        const field = FIELDS[currentField].id;
        setValues((prev) => ({ ...prev, [field]: prev[field].slice(0, -1) }));
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        const field = FIELDS[currentField].id;
        setValues((prev) => ({ ...prev, [field]: prev[field] + input }));
      }
      return;
    }

    // --- Confirm delete handling ---
    if (confirmDelete) {
      if (input === "y" || input === "Y") {
        deleteAccount(confirmDelete)
          .then(() => {
            setConfirmDelete(null);
            return fetchAccounts();
          })
          .then(setAccounts)
          .catch(() => {
            setConfirmDelete(null);
          });
      } else {
        setConfirmDelete(null);
      }
      return;
    }

    // --- List navigation ---
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setCursorIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setCursorIndex((prev) => Math.min(accounts.length, prev + 1)); // +1 for "Add new" option
      return;
    }

    if (key.return) {
      if (cursorIndex === accounts.length) {
        setShowAddForm(true);
      }
      return;
    }

    if (input === "d" || input === "D") {
      if (accounts[cursorIndex]) {
        setConfirmDelete(accounts[cursorIndex].id);
      }
    }
  });

  if (!isOpen) return null;

  // --- Render add form ---
  if (showAddForm) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="green"
        paddingX={1}
      >
        <Text bold color="green">
          {"Add New Account"}
        </Text>
        <Text dimColor>{"Tab/Enter next field · Esc cancel"}</Text>
        <Box flexDirection="column" marginTop={1}>
          {FIELDS.map((field, i) => (
            <Box key={field.id}>
              <Text color={i === currentField ? "cyan" : undefined}>
                {i === currentField ? "❯ " : "  "}
              </Text>
              <Box width={16}>
                <Text>{field.label}:</Text>
              </Box>
              <Text color={i === currentField ? "green" : undefined}>
                {values[field.id]}
                {i === currentField && "|"}
              </Text>
            </Box>
          ))}
          {formError && (
            <Box marginTop={1}>
              <Text color="red">{formError}</Text>
            </Box>
          )}
          {submitting && (
            <Box marginTop={1}>
              <Text dimColor>Creating account...</Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // --- Render confirm delete ---
  if (confirmDelete) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="red"
        paddingX={1}
      >
        <Text color="red" bold>
          {"Confirm Delete"}
        </Text>
        <Text>Delete account {confirmDelete}?</Text>
        <Text dimColor>{"Press Y to confirm, any other key to cancel"}</Text>
      </Box>
    );
  }

  // --- Render account list ---
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
    >
      <Text bold color="yellow">
        {"Account Management"}
      </Text>
      <Text dimColor>{"↑↓ navigate · D delete · Esc close"}</Text>
      <Box flexDirection="column" marginTop={1}>
        {loading && <Text dimColor>Loading...</Text>}
        {!loading && accounts.length === 0 && (
          <Text dimColor>No accounts found</Text>
        )}
        {accounts.map((acc, i) => (
          <Box key={acc.id}>
            <Text color={i === cursorIndex ? "cyan" : undefined}>
              {i === cursorIndex ? "❯ " : "  "}
            </Text>
            <Text>{acc.email || acc.name || acc.id}</Text>
            <Text dimColor>{` (${acc.provider_id})`}</Text>
            {!acc.is_enabled && <Text color="red">{" [disabled]"}</Text>}
          </Box>
        ))}
        {/* Add new option */}
        <Box>
          <Text color={cursorIndex === accounts.length ? "cyan" : "green"}>
            {cursorIndex === accounts.length ? "❯ " : "  "}
          </Text>
          <Text color="green">{"+ Add new account"}</Text>
        </Box>
      </Box>
    </Box>
  );
}
