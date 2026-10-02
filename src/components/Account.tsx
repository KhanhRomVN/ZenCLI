import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { fetchAccounts, deleteAccount, type Account as ApiAccount, type AccountsResponse } from "../services/api.js";

// ─── Types ─────────────────────────────────────────────────────────────
interface ProviderConfig {
  provider_id: string;
  provider_name: string;
  website?: string;
  connection_type?: string;
  can_refresh_token?: boolean;
}

interface Account extends Omit<ApiAccount, 'provider'> {
  // Ensure all fields needed for display are present or optional
  period_requests?: number;
  period_tokens?: number;
  total_requests?: number;
  total_tokens?: number;
  usage?: number | string;
  reset_usage_at?: string;
  is_active_cli?: boolean;
}

type ViewMode = "list" | "detail";

// ─── Helpers ────────────────────────────────────────────────────────────
function getProviderColor(providerId: string): string {
  switch (providerId.toLowerCase()) {
    case "claude": return "orangeBright";
    case "anthropic": return "orangeBright";
    case "qwen": return "cyanBright";
    case "alibaba": return "cyanBright";
    case "kimi": return "blueBright";
    case "moonshot": return "blueBright";
    case "gemini": return "magentaBright";
    case "google": return "magentaBright";
    case "gpt": return "greenBright";
    case "openai": return "greenBright";
    default: return "white";
  }
}

function formatResetLabel(resetAt: string | null | undefined): { text: string; color: string } {
  if (!resetAt) return { text: "--", color: "gray" };
  
  const date = new Date(resetAt);
  if (isNaN(date.getTime())) return { text: "Invalid", color: "red" };
  
  const diffMs = date.getTime() - Date.now();
  
  if (diffMs <= 0) {
    return { text: "Done", color: "greenBright" };
  }
  
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    return { text: "<1h", color: "yellowBright" };
  }
  if (diffHours < 24) {
    return { text: `${diffHours}h`, color: "yellow" };
  }
  
  const diffDays = Math.ceil(diffHours / 24);
  return { text: `${diffDays}d`, color: "cyan" };
}

function formatExpiryLabel(account: Account): { text: string; color: string } {
  if ((account as any).expires_at) {
     const d = new Date((account as any).expires_at);
     if (d.getTime() < Date.now()) return { text: "Expired", color: "redBright" };
     return { text: d.toISOString().split('T')[0], color: "gray" };
  }
  return { text: "-", color: "gray" };
}

// ─── Component ──────────────────────────────────────────────────────────
const PAGE_SIZE_LOCAL = 8; // Items displayed per screen in CLI
const FETCH_LIMIT_ALL = 9999; // High limit to fetch all accounts at once for consistency

export function Account({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }): React.JSX.Element | null {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({});
  
  // UI State
  const [cursorIndex, setCursorIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Load data when opened
  useEffect(() => {
    if (!isOpen) return;
    
    setIsLoading(true);
    setError(null);
    setPage(0);
    setCursorIndex(0);
    setActiveTab("all");
    setSelectedAccountId(null);
    
    Promise.all([
      fetchAccounts({ page: 1, limit: FETCH_LIMIT_ALL }),
      fetch("/v1/providers").then(r => r.ok ? r.json() : { success: false, data: [] }).catch(() => ({ success: false, data: [] }))
    ])
      .then(([accResp, provResp]: [AccountsResponse, any]) => {
        setAllAccounts(accResp.accounts as Account[]);
        
        const pMap: Record<string, ProviderConfig> = {};
        if (provResp?.success && Array.isArray(provResp.data)) {
          provResp.data.forEach((p: any) => {
            pMap[p.provider_id] = {
              provider_id: p.provider_id,
              provider_name: p.provider_name || p.provider_id,
              website: p.website,
              connection_type: p.connection_type,
              can_refresh_token: p.can_refresh_token,
            };
          });
        }
        setProviders(pMap);
      })
      .catch(err => {
        setError("Failed to load accounts: " + (err instanceof Error ? err.message : String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  // Derive Tabs from FULL dataset
  const tabs = useMemo(() => {
    const counts: Record<string, number> = {};
    allAccounts.forEach(acc => {
      counts[acc.provider_id] = (counts[acc.provider_id] || 0) + 1;
    });

    const providerTabs = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .map(pid => ({
        id: pid,
        label: providers[pid]?.provider_name || pid,
        count: counts[pid],
      }));

    return [
      { id: "all", label: "All", count: allAccounts.length },
      ...providerTabs,
    ];
  }, [allAccounts, providers]);

  // Filtered Accounts (Client-side filtering for instant tab switch)
  const filteredAccounts = useMemo(() => {
    if (activeTab === "all") return allAccounts;
    return allAccounts.filter(a => a.provider_id === activeTab);
  }, [allAccounts, activeTab]);

  // Local Pagination
  const startIndex = page * PAGE_SIZE_LOCAL;
  const endIndex = startIndex + PAGE_SIZE_LOCAL;
  const visibleAccounts = filteredAccounts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredAccounts.length / PAGE_SIZE_LOCAL) || 1;

  const currentFocusedAccount = visibleAccounts[cursorIndex];
  
  const canRefreshCurrent = useMemo(() => {
    if (!currentFocusedAccount) return false;
    const prov = providers[currentFocusedAccount.provider_id];
    return !!prov?.can_refresh_token;
  }, [currentFocusedAccount, providers]);

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount(id);
      setAllAccounts(prev => prev.filter(a => a.id !== id));
      setConfirmDeleteId(null);
      setSelectedAccountId(null);
      
      // Adjust cursor if we deleted the last item on current page
      const newFilteredCount = activeTab === "all" 
        ? allAccounts.length - 1 
        : allAccounts.filter(a => a.provider_id === activeTab && a.id !== id).length;
      
      const newVisibleCount = Math.min(PAGE_SIZE_LOCAL, newFilteredCount - startIndex);
      
      if (cursorIndex >= newVisibleCount) {
        setCursorIndex(Math.max(0, newVisibleCount - 1));
      }
    } catch (err: any) {
      setError("Delete failed: " + err.message);
      setConfirmDeleteId(null);
    }
  };

  useInput((input, key) => {
    if (!isOpen) return;

    const isCloseKey = key.escape || (key.ctrl && input === "c");

    if (isCloseKey) {
      if (confirmDeleteId) {
        setConfirmDeleteId(null);
        return;
      }
      if (selectedAccountId) {
        setSelectedAccountId(null);
        return;
      }
      onClose();
      return;
    }

    if (confirmDeleteId) {
      if (input === "y" || input === "Y") {
        handleDelete(confirmDeleteId);
      }
      return;
    }

    // --- BROWSE MODE ---
    if (!selectedAccountId) {
      if (key.tab) {
         const currentTabIdx = tabs.findIndex(t => t.id === activeTab);
         const nextIdx = (currentTabIdx + 1) % tabs.length;
         setActiveTab(tabs[nextIdx].id);
         setPage(0);
         setCursorIndex(0);
         return;
      }

      if (key.leftArrow) {
        if (page > 0) {
          setPage(page - 1);
          setCursorIndex(PAGE_SIZE_LOCAL - 1);
        }
        return;
      }
      if (key.rightArrow) {
        if (page < totalPages - 1) {
          setPage(page + 1);
          setCursorIndex(0);
        }
        return;
      }

      if (key.upArrow) {
        setCursorIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        const maxIdx = visibleAccounts.length - 1;
        setCursorIndex(prev => Math.min(maxIdx, prev + 1));
        return;
      }

      if (key.return) {
        if (currentFocusedAccount) {
          setSelectedAccountId(currentFocusedAccount.id);
        }
        return;
      }
    } 
    // --- ACTION MODE ---
    else {
      if (key.upArrow) {
        const newIndex = Math.max(0, cursorIndex - 1);
        setCursorIndex(newIndex);
        if (visibleAccounts[newIndex]) {
           setSelectedAccountId(visibleAccounts[newIndex].id);
        }
        return;
      }
      if (key.downArrow) {
        const maxIdx = visibleAccounts.length - 1;
        const newIndex = Math.min(maxIdx, cursorIndex + 1);
        setCursorIndex(newIndex);
         if (visibleAccounts[newIndex]) {
           setSelectedAccountId(visibleAccounts[newIndex].id);
        }
        return;
      }

      if (key.return) {
        setSelectedAccountId(null);
        return;
      }

      if (input === "d" || input === "D") {
        if (selectedAccountId) {
          setConfirmDeleteId(selectedAccountId);
        }
        return;
      }

      if (input === "r" || input === "R") {
        if (canRefreshCurrent) {
          setError("Refreshing token... (Not implemented in backend yet)");
          setTimeout(() => setError(null), 2000);
        }
        return;
      }
    }
  });

  if (!isOpen) return null;

  if (confirmDeleteId) {
    const accToDelete = allAccounts.find(a => a.id === confirmDeleteId);
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="red" paddingX={1}>
        <Text bold color="red">Confirm Delete</Text>
        <Text>Delete account "{accToDelete?.email}"?</Text>
        <Text dimColor>Press Y to confirm, Esc to cancel</Text>
      </Box>
    );
  }

  const isActionMode = selectedAccountId !== null;

  return (
    <Box flexDirection="column">
      {/* Header & Tabs */}
      <Box flexDirection="column" marginBottom={1}>
        <Box justifyContent="space-between">
          <Text bold color="yellow">Account Management</Text>
          {isLoading && <Text dimColor>Loading...</Text>}
        </Box>
        <Text dimColor>Manage saved credentials, monitor usage stats, and switch active providers.</Text>
      </Box>

      {/* Tab Bar */}
      <Box marginBottom={1} flexWrap="wrap">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Box key={tab.id} marginRight={2}>
              <Text 
                color={isActive ? "cyanBright" : "gray"} 
                bold={isActive}
                underline={isActive}
              >
                {tab.label} ({tab.count})
              </Text>
            </Box>
          );
        })}
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {/* Info Line */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text dimColor>Page {page + 1}/{totalPages}</Text>
        <Text dimColor>Total: {filteredAccounts.length}</Text>
      </Box>

      {/* Table Header */}
      <Box paddingLeft={1} marginBottom={0}>
        <Box width={3} />
        <Box width={10}>
          <Text bold dimColor>PROVIDER</Text>
        </Box>
        <Box flexGrow={1}>
          <Text bold dimColor>EMAIL</Text>
        </Box>
        <Box width={6} justifyContent="flex-end">
          <Text bold dimColor>REQS</Text>
        </Box>
        <Box width={8} justifyContent="flex-end">
          <Text bold dimColor>TOKNS</Text>
        </Box>
        <Box width={6} justifyContent="flex-end">
          <Text bold dimColor>USE%</Text>
        </Box>
        <Box width={8} marginLeft={1}>
          <Text bold dimColor>RESET</Text>
        </Box>
        <Box width={12} marginLeft={1}>
          <Text bold dimColor>EXPIRY</Text>
        </Box>
      </Box>

      {/* Account List */}
      <Box flexDirection="column" minHeight={PAGE_SIZE_LOCAL} paddingLeft={1}>
        {visibleAccounts.length === 0 && !isLoading && (
          <Box marginTop={1}><Text dimColor>No accounts found in this category.</Text></Box>
        )}
        
        {visibleAccounts.map((acc, idx) => {
          const isSelectedByCursor = idx === cursorIndex;
          const isExpanded = isActionMode && selectedAccountId === acc.id;
          
          const providerName = providers[acc.provider_id]?.provider_name || acc.provider_id;
          const provColor = getProviderColor(acc.provider_id);
          const email = acc.email || "-";
          const reqs = acc.period_requests ?? 0;
          const tokens = acc.period_tokens ?? 0;
          const usagePercent = acc.usage != null ? Number(acc.usage) : 0;
          
          const fmtTokens = tokens >= 1_000_000 
            ? `${(tokens / 1_000_000).toFixed(1)}M` 
            : tokens >= 1_000 
              ? `${(tokens / 1_000).toFixed(1)}K` 
              : tokens.toString();

          const isActive = acc.is_active_cli === true;
          const prefixStr = `${isSelectedByCursor ? "❯" : " "}${isActive ? "✓" : " "}`;
          const resetInfo = formatResetLabel(acc.reset_usage_at);
          const expiryInfo = formatExpiryLabel(acc);

          return (
            <Box key={acc.id} flexDirection="column">
              {/* Main Row */}
              <Box>
                <Box width={3}>
                  <Text color={isSelectedByCursor ? "cyanBright" : "gray"} bold={isSelectedByCursor}>
                    {prefixStr}
                  </Text>
                </Box>
                <Box width={10}>
                  <Text color={provColor} bold={!isSelectedByCursor && !isActive}>
                    {providerName.substring(0, 9).padEnd(9)}
                  </Text>
                </Box>
                <Box flexGrow={1}>
                  <Text color={isSelectedByCursor ? "white" : "gray"}>
                    {email}
                  </Text>
                </Box>
                <Box width={6} justifyContent="flex-end">
                  <Text dimColor>{reqs}r</Text>
                </Box>
                <Box width={8} justifyContent="flex-end">
                  <Text dimColor>{fmtTokens}</Text>
                </Box>
                <Box width={6} justifyContent="flex-end">
                   {usagePercent > 0 ? (
                     <Text color={usagePercent > 90 ? "red" : usagePercent > 70 ? "yellow" : "cyan"}>
                       {Math.round(usagePercent)}%
                     </Text>
                   ) : (
                     <Text dimColor>--</Text>
                   )}
                </Box>
                <Box width={8} marginLeft={1}>
                  <Text color={resetInfo.color}>
                    {resetInfo.text.padStart(6)}
                  </Text>
                </Box>
                <Box width={12} marginLeft={1}>
                  <Text color={expiryInfo.color}>
                    {expiryInfo.text.padStart(10)}
                  </Text>
                </Box>
              </Box>

              {/* Expanded Details */}
              {isExpanded && (
                <Box flexDirection="column" paddingLeft={3} marginTop={0}>
                  <Box>
                    <Text dimColor>ID: </Text>
                    <Text color="gray">{acc.id.substring(0, 16)}...</Text>
                  </Box>
                  
                  {acc.credential && (
                    <Box>
                      <Text dimColor>Cred: </Text>
                      <Text color="magenta">
                        {acc.credential.length > 20 
                          ? acc.credential.substring(0, 17) + "***" 
                          : acc.credential}
                      </Text>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Footer Help */}
      <Box marginTop={1}>
        {!isActionMode ? (
          <Text dimColor>↑↓ navigate · ←→ page · Tab switch · Enter select · Esc(Ctrl+C) close</Text>
        ) : (
          <Text dimColor>
            ↑↓ switch · Enter unselect · D delete{canRefreshCurrent ? " · R refresh" : ""} · Esc(Ctrl+C) close
          </Text>
        )}
      </Box>
    </Box>
  );
}