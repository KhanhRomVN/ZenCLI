import React, { useState, useEffect } from "react";
import { Text, Box, useInput, useApp, Newline, useStdin } from "ink";
import { storage } from "../../core/lib/storage.js";
import { authManager } from "../../core/lib/auth-manager.js";
import { Account } from "../../core/types/index.js";
import { logger } from "../../core/lib/logger.js";
import gradient from "gradient-string";

interface AccountManagerProps {
  onBack: () => void;
}

const ITEMS_PER_PAGE = 5;

// Custom simple ASCII (reused)
const customLogo = gradient([
  "#ff0000",
  "#ff8c00",
  "#ffeb3b",
  "#4caf50",
  "#2196f3",
  "#9c27b0",
])(
  ` ███████╗███████╗███╗   ██╗ ██████╗██╗     ██╗
 ╚══███╔╝██╔════╝████╗  ██║██╔════╝██║     ██║
   ███╔╝ █████╗  ██╔██╗ ██║██║     ██║     ██║
  ███╔╝  ██╔══╝  ██║╚██╗██║██║     ██║     ██║
 ███████╗███████╗██║ ╚████║╚██████╗███████╗██║
 ╚══════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝
            (made by KhanhRomVN)`
);

export const AccountManager: React.FC<AccountManagerProps> = ({ onBack }) => {
  const [accounts, setAccounts] = useState<Account[]>(storage.getAccounts());
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { exit } = useApp();
  const { isRawModeSupported, setRawMode } = useStdin();

  const totalPages = Math.ceil(accounts.length / ITEMS_PER_PAGE);
  const activeAccount = storage.getActiveAccount();

  useEffect(() => {
    if (isRawModeSupported) {
      setRawMode(true);
    }

    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
    // Adjust selected index if it exceeds current page items
    const start = currentPage * ITEMS_PER_PAGE;
    const currentItemsCount = Math.min(ITEMS_PER_PAGE, accounts.length - start);
    if (selectedIndex >= currentItemsCount && currentItemsCount > 0) {
      setSelectedIndex(currentItemsCount - 1);
    }
  }, [accounts, currentPage, totalPages, isRawModeSupported, setRawMode]);

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
    setTimeout(() => setMessage(""), 3000);
  };

  const handleRemoveAccount = async () => {
    const start = currentPage * ITEMS_PER_PAGE;
    const accountToDelete = accounts[start + selectedIndex];
    if (accountToDelete) {
      storage.removeAccount(accountToDelete.id);
      refreshAccounts();
      setMessage("✅ Account removed!");
    }
    setShowDeleteConfirm(false);
    setTimeout(() => setMessage(""), 2000);
  };

  useInput((input, key) => {
    logger.info("[AccountManager] Input received", {
      input,
      key,
      isLoading,
      showDeleteConfirm,
    });

    // Handle Ctrl+C global exit
    if (input === "c" && key.ctrl) {
      logger.info("[AccountManager] Ctrl+C pressed - Exiting App");
      process.exit(0);
    }

    if (isLoading) return;

    // Delete Confirmation Mode
    if (showDeleteConfirm) {
      if (input === "y" || input === "Y" || key.return) {
        logger.info("[AccountManager] Confirm delete");
        handleRemoveAccount();
      } else if (input === "n" || input === "N" || key.escape) {
        logger.info("[AccountManager] Cancel delete");
        setShowDeleteConfirm(false);
      }
      return;
    }

    // Normal Mode
    if (key.escape) {
      logger.info("[AccountManager] Esc pressed - Returning");
      onBack();
      exit();
      return;
    }

    if (key.leftArrow) {
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
        setSelectedIndex(0);
      }
    }

    if (key.rightArrow) {
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
        setSelectedIndex(0);
      }
    }

    const start = currentPage * ITEMS_PER_PAGE;
    const currentItems = accounts.slice(start, start + ITEMS_PER_PAGE);

    if (key.upArrow) {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : currentItems.length - 1
      );
    }

    if (key.downArrow) {
      setSelectedIndex((prev) =>
        prev < currentItems.length - 1 ? prev + 1 : 0
      );
    }

    if (input === "c" || input === "C") {
      logger.info("[AccountManager] Create account trigger");
      handleAddAccount();
    }

    if (input === "d" || input === "D") {
      logger.info("[AccountManager] Delete account trigger");
      if (currentItems[selectedIndex]) {
        setShowDeleteConfirm(true);
      }
    }
  });

  // Render Table Helpers
  const renderHeader = () => (
    <Box
      borderStyle="single"
      borderColor="cyan"
      flexDirection="row"
      width="100%"
    >
      <Box width={6}>
        <Text bold color="cyan">
          {" "}
          STT
        </Text>
      </Box>
      <Box width={30}>
        <Text bold color="cyan">
          {" "}
          Email
        </Text>
      </Box>
      <Box width={20}>
        <Text bold color="cyan">
          {" "}
          Username
        </Text>
      </Box>
      <Box width={10}>
        <Text bold color="cyan">
          {" "}
          Inputs
        </Text>
      </Box>
      <Box width={10}>
        <Text bold color="cyan">
          {" "}
          Outputs
        </Text>
      </Box>
      <Box width={10}>
        <Text bold color="cyan">
          {" "}
          Req
        </Text>
      </Box>
    </Box>
  );

  const getCurrentPageItems = () => {
    const start = currentPage * ITEMS_PER_PAGE;
    return accounts.slice(start, start + ITEMS_PER_PAGE);
  };

  return (
    <Box flexDirection="column" padding={1} width="100%">
      <Text>{customLogo}</Text>
      <Newline />
      <Box marginBottom={1}>
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

      {showDeleteConfirm && (
        <Box
          marginBottom={1}
          borderStyle="double"
          borderColor="red"
          paddingX={1}
        >
          <Text color="red" bold>
            Are you sure you want to delete this account? (y/n)
          </Text>
        </Box>
      )}

      {/* Table Header */}
      {renderHeader()}

      {/* Table Body */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="white"
        width="100%"
        height={7}
      >
        {accounts.length === 0 ? (
          <Box padding={1}>
            <Text color="gray">No accounts found.</Text>
          </Box>
        ) : (
          getCurrentPageItems().map((acc: any, idx) => {
            const isSelected = selectedIndex === idx;
            const globalIndex = currentPage * ITEMS_PER_PAGE + idx + 1;
            const activeAccount = storage.getActiveAccount();
            const isActive = activeAccount?.id === acc.id;

            // Safe accessors for potential missing fields defaults
            const inputs = acc.inputTokens || 0;
            const outputs = acc.outputTokens || 0;
            const reqs = acc.reqCount || 0;

            return (
              <Box key={acc.id} flexDirection="row" width="100%">
                <Box width={6}>
                  <Text
                    color={isSelected ? "green" : "white"}
                    bold={isSelected}
                  >
                    {isSelected ? "→" : " "} {globalIndex}
                  </Text>
                </Box>
                <Box width={30}>
                  <Text color={isActive ? "green" : "white"}>
                    {acc.email || "N/A"}
                  </Text>
                </Box>
                <Box width={20}>
                  <Text color="white" wrap="truncate-end">
                    {acc.name}
                  </Text>
                </Box>
                <Box width={10}>
                  <Text color="gray">{inputs}</Text>
                </Box>
                <Box width={10}>
                  <Text color="gray">{outputs}</Text>
                </Box>
                <Box width={10}>
                  <Text color="gray">{reqs}</Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer / Pagination */}
      <Box justifyContent="space-between" width="100%" marginTop={1}>
        <Text color="gray">
          Page {totalPages === 0 ? 0 : currentPage + 1}/{totalPages}
        </Text>
        <Text color="gray">
          Arrow Keys: Nav/Page | C: Create | D: Delete | Esc: Return
        </Text>
      </Box>

      {isLoading && <Text color="yellow">Loading...</Text>}
    </Box>
  );
};
