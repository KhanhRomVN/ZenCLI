import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { storage } from "../lib/storage.js";
import { authManager } from "../lib/auth-manager.js";

interface AccountManagerProps {
  onBack: () => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({ onBack }) => {
  const [accounts, setAccounts] = useState(storage.getAccounts());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const activeAccount = storage.getActiveAccount();

  useEffect(() => {
    refreshAccounts();
  }, []);

  const refreshAccounts = () => {
    setAccounts(storage.getAccounts());
  };

  const handleAddAccount = async () => {
    setIsLoading(true);
    setMessage("Opening browser for login...");
    try {
      await authManager.login();
      refreshAccounts();
      setMessage("✅ Account added successfully!");
    } catch (error: any) {
      setMessage(`❌ Failed to add account: ${error.message}`);
    }
    setIsLoading(false);

    // Clear message after 3 seconds
    setTimeout(() => setMessage(""), 3000);
  };

  const handleSwitchAccount = async (accountId: string) => {
    await storage.setActiveAccount(accountId);
    refreshAccounts();
    setMessage("✅ Account switched!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleRemoveAccount = async (accountId: string) => {
    storage.removeAccount(accountId);
    refreshAccounts();
    setMessage("✅ Account removed!");
    setTimeout(() => setMessage(""), 2000);
  };

  useInput(
    (
      input: string,
      key: { escape: any; upArrow: any; downArrow: any; return: any }
    ) => {
      if (key.escape || input === "q" || input === "b") {
        onBack();
        return;
      }

      if (key.upArrow && accounts.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : accounts.length - 1));
      }

      if (key.downArrow && accounts.length > 0) {
        setSelectedIndex((prev) => (prev < accounts.length - 1 ? prev + 1 : 0));
      }

      if (key.return && accounts.length > 0) {
        const account = accounts[selectedIndex];
        if (input === "d" || input === "D") {
          // Delete account
          handleRemoveAccount(account.id);
        } else {
          // Switch to account
          handleSwitchAccount(account.id);
        }
      }

      if (input === "a" || input === "A") {
        handleAddAccount();
      }

      if (input === "r" || (input === "R" && accounts.length > 0)) {
        handleRemoveAccount(accounts[selectedIndex].id);
      }
    }
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={2}>
        <Text bold color="magenta">
          🔐 ACCOUNT MANAGEMENT
        </Text>
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color={message.includes("✅") ? "green" : "red"}>
            {message}
          </Text>
        </Box>
      )}

      {accounts.length === 0 ? (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="yellow">No accounts found.</Text>
          <Text color="gray">Press 'A' to add your first account</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="green" bold>
            📋 ALL ACCOUNTS ({accounts.length})
          </Text>
          {accounts.map((account, index) => {
            const isActive = activeAccount?.id === account.id;
            const isSelected = selectedIndex === index;

            return (
              <Box key={account.id} marginBottom={1}>
                <Text color={isSelected ? "green" : "white"}>
                  {isSelected ? "→ " : "  "}
                  {isActive ? "🟢" : "⚪"} {account.name}
                </Text>
                {account.email && <Text color="gray"> ({account.email})</Text>}
              </Box>
            );
          })}
        </Box>
      )}

      <Box flexDirection="column">
        <Text color="yellow" bold>
          📝 COMMANDS
        </Text>
        <Text color="cyan">A - Add new account</Text>
        {accounts.length > 0 && (
          <>
            <Text color="cyan">↑↓ - Select account</Text>
            <Text color="cyan">Enter - Switch to selected account</Text>
            <Text color="cyan">R - Remove selected account</Text>
          </>
        )}
        <Text color="cyan">B/Q - Back to main menu</Text>
      </Box>

      {isLoading && (
        <Box marginTop={1}>
          <Text color="yellow">Loading...</Text>
        </Box>
      )}
    </Box>
  );
};
