import React, { useState, useEffect, useRef, useMemo } from "react";
import * as fs from "fs";
import * as path from "path";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { getApiUrl } from "../services/api.js";

// ─── Types ────────────────────────────────────────────────────────────
interface RawProvider {
  provider_id: string;
  provider_name: string;
  description?: string;
  website?: string;
  website_url?: string;
  connection_type?: string; // 'https' | 'browser'
  auth_methods?: string[]; 
  auth_method?: string; // Sometimes returned as single string or comma-separated
  is_enabled?: boolean;
}

interface Provider {
  provider_id: string;
  provider_name: string;
  description?: string;
  website?: string;
  website_url?: string;
  connection_type?: string;
  authMethodsList: string[]; // Normalized list
  is_enabled?: boolean;
}

interface PendingLogin {
  user_code?: string;
  verification_url?: string;
  poll_context?: string;
  interval_ms: number;
  provider: Provider;
  method: string;
}

interface AccountDraft {
  provider_id: string;
  email: string;
  credential: string;
  auth_method: string;
}

interface AddAccountProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 
  | "select-provider" 
  | "select-method" 
  | "select-profile"
  | "initiating-login" 
  | "waiting-auth" 
  | "confirm-save";

const PAGE_SIZE_PROVIDERS = 6; // Number of provider cards per page
const PAGE_SIZE_PROFILES = 8; // Number of profile rows per page

/**
 * Helper to normalize auth methods from various API response formats.
 * Backend may return either `auth_methods` or `auth_method`, and the value
 * may be an array of strings OR a single string (comma/whitespace separated).
 */
function normalizeAuthMethods(raw: RawProvider): string[] {
  // Prefer whichever field actually carries data (matches AddAccountDrawer.tsx order:
  //   provider.auth_method ?? provider.auth_methods)
  const candidates: any[] = [raw.auth_method, raw.auth_methods];

  for (const value of candidates) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      const cleaned = value.filter(
        (m): m is string => typeof m === "string" && m.trim().length > 0,
      );
      if (cleaned.length > 0) return cleaned;
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (m): m is string => typeof m === "string" && m.trim().length > 0,
          );
          if (cleaned.length > 0) return cleaned;
        }
      } catch {
        const parts = trimmed
          .split(/[,;|\s]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (parts.length > 0) return parts;
      }
    }
  }

  return [];
}

/**
 * Get short domain from URL
 */
function getDomain(url: string | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.split("//")[1]?.split("/")[0] || url;
  }
}

/**
 * Modern Minimalist TUI Component for adding accounts.
 * Features: High-density list, accent-based selection, rich metadata tags.
 */
export function AddAccount({ onClose, onSuccess }: AddAccountProps): React.JSX.Element {
  const [step, setStep] = useState<Step>("select-provider");
  const [rawProviders, setRawProviders] = useState<RawProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection State
  const [cursorIndex, setCursorIndex] = useState(0); // Absolute index in the full list
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  
  // Login State
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);
  const [draftAccount, setDraftAccount] = useState<AccountDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Profile selection state (browser-based providers)
  const [profileFolders, setProfileFolders] = useState<string[]>([]);
  const [profileBaseDir, setProfileBaseDir] = useState<string>("");
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Normalize providers once loaded
  const providers: Provider[] = useMemo(() => {
    return rawProviders.map(p => ({
      ...p,
      authMethodsList: normalizeAuthMethods(p),
    })).sort((a, b) => {
      if (a.is_enabled === b.is_enabled) return a.provider_name.localeCompare(b.provider_name);
      return a.is_enabled ? -1 : 1;
    });
  }, [rawProviders]);

  // Scrolling window for providers: keep cursor centered-ish within PAGE_SIZE_PROVIDERS rows
  const providerStart = useMemo(() => {
    if (providers.length <= PAGE_SIZE_PROVIDERS) return 0;
    // Try to keep the selected item around middle of the window
    const half = Math.floor(PAGE_SIZE_PROVIDERS / 2);
    let start = cursorIndex - half;
    if (start < 0) start = 0;
    if (start + PAGE_SIZE_PROVIDERS > providers.length) {
      start = Math.max(0, providers.length - PAGE_SIZE_PROVIDERS);
    }
    return start;
  }, [cursorIndex, providers.length]);

  const visibleProviders = providers.slice(providerStart, providerStart + PAGE_SIZE_PROVIDERS);

  // ─── Fetch Providers ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/v1/providers`);
        if (!res.ok) throw new Error("Failed to load providers");
        const data: any = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setRawProviders(data.data);
        } else {
          setError("Invalid response format");
        }
      } catch (err: any) {
        setError(err.message || "Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
    
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Reset cursor when entering a new step (provider/method/profile lists)
  useEffect(() => {
    setCursorIndex(0);
  }, [step, selectedProvider?.provider_id]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  
  const handleSelectProvider = () => {
    // cursorIndex is now absolute across the whole list, so read from `providers`
    const p = providers[cursorIndex];
    if (!p || p.is_enabled === false) return;
    
    setSelectedProvider(p);
    
    const methods = p.authMethodsList; 
    
    if (methods.length === 0) {
       setError("No authentication methods configured for this provider.");
       return;
    }

    if (methods.length === 1) {
      setSelectedMethod(methods[0]);
      handleSelectMethod(methods[0]);
    } else {
      setStep("select-method");
      setCursorIndex(0); // Reset cursor for method list
    }
  };

  const handleSelectMethod = async (method: string) => {
    if (!selectedProvider) return;

    // Always pick a Chromium profile before initiating login to isolate sessions.
    setSelectedMethod(method);
    await loadChromiumProfiles();
    setStep("select-profile");
    setCursorIndex(0);
  };

  /**
   * Read /v1/config to get chromium_profile_dir, then list immediate subfolders
   * as available profiles (mirrors AddAccountDrawer.tsx behavior).
   */
  const loadChromiumProfiles = async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const res = await fetch(`${getApiUrl()}/v1/config`);
      if (!res.ok) throw new Error("Failed to load config");
      const data: any = await res.json();
      const dir: string | undefined = data?.data?.chromium_profile_dir;
      if (!dir) {
        setProfileFolders([]);
        setProfileBaseDir("");
        setProfilesError("chromium_profile_dir chưa được cấu hình trong Settings");
        return;
      }
      setProfileBaseDir(dir);

      if (!fs.existsSync(dir)) {
        setProfileFolders([]);
        setProfilesError(`Thư mục profile không tồn tại: ${dir}`);
        return;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const folders = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b));
      setProfileFolders(folders);
    } catch (err: any) {
      setProfileFolders([]);
      setProfilesError(err.message || "Không đọc được danh sách profile");
    } finally {
      setProfilesLoading(false);
    }
  };

  const startLoginFlow = async (provider: Provider, method: string, profileFolder?: string) => {
    setStep("initiating-login");
    setError(null);
    
    try {
      const res = await fetch(`${getApiUrl()}/v1/accounts/login/${provider.provider_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          method, 
          ...(profileFolder ? { profile_folder: profileFolder } : {}) 
        }),
      });
      
      const data: any = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login initiation failed");
      }
      
      const accountData = data.account;
      
      if (accountData.pending && accountData.user_code && accountData.verification_url) {
        setPendingLogin({
          user_code: accountData.user_code,
          verification_url: accountData.verification_url,
          poll_context: accountData.pollContext || accountData.tempSessionId,
          interval_ms: (accountData.poll_interval || 5) * 1000,
          provider,
          method,
        });
        setStep("waiting-auth");
        startPolling(accountData.pollContext || accountData.tempSessionId, provider.provider_id, (accountData.poll_interval || 5) * 1000);
        return;
      }
      
      if (accountData.credential) {
        setDraftAccount({
          provider_id: provider.provider_id,
          email: accountData.email || "",
          credential: accountData.credential,
          auth_method: method,
        });
        setStep("confirm-save");
        return;
      }
      
      if (accountData.pending && accountData.tempSessionId) {
         setDraftAccount({
           provider_id: provider.provider_id,
           email: accountData.email || "",
           credential: accountData.credential || "",
           auth_method: method,
         });
         setStep("confirm-save");
         return;
      }

      throw new Error("Unexpected login response structure");

    } catch (err: any) {
      setError(err.message || "An error occurred during login initiation");
      setStep("select-method");
    }
  };

  const startPolling = (context: string, providerId: string, intervalMs: number) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${getApiUrl()}/v1/accounts/login/${providerId}/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pollContext: context }),
        });
        const data: any = await res.json();
        
        if (data.error) {
          stopPolling();
          setError(data.error);
          setStep("select-method");
          return;
        }
        
        if (data.done && data.account) {
          stopPolling();
          setDraftAccount({
            provider_id: providerId,
            email: data.account.email || "",
            credential: data.account.credential,
            auth_method: selectedMethod || "auto",
          });
          setStep("confirm-save");
        }
      } catch {
        // Silent fail on network glitch
      }
    }, Math.max(intervalMs, 3000));
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const handleConfirmSave = async () => {
    if (!draftAccount) return;
    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch(`${getApiUrl()}/v1/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftAccount),
      });
      
      const data: any = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || "Failed to save account");
      }
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    stopPolling();
    if (step === "waiting-auth") setStep("select-profile");
    else if (step === "confirm-save") setStep("select-profile");
    else if (step === "select-profile") setStep("select-method");
    else if (step === "select-method") setStep("select-provider");
    else if (step === "select-provider") onClose();
  };

  // ─── Input Handling ───────────────────────────────────────────────────
  useInput((input, key) => {
    // Ctrl+C: thoát hoàn toàn khỏi màn hình AddAccount (không quay back từng bước)
    if (key.ctrl && input === "c") {
      stopPolling();
      onClose();
      return;
    }

    if (key.escape) {
      handleBack();
      return;
    }

    if (step === "select-provider") {
      // Absolute-index navigation with automatic scrolling window
      if (key.upArrow) setCursorIndex(prev => Math.max(0, prev - 1));
      if (key.downArrow) setCursorIndex(prev => Math.min(providers.length - 1, prev + 1));
      
      if (key.return) handleSelectProvider();
    }
    else if (step === "select-method") {
      const methods = selectedProvider?.authMethodsList || [];
      if (key.upArrow) setCursorIndex(prev => Math.max(0, prev - 1));
      if (key.downArrow) setCursorIndex(prev => Math.min(methods.length - 1, prev + 1));
      if (key.return) handleSelectMethod(methods[cursorIndex]);
    }
    else if (step === "select-profile") {
      // Absolute-index navigation with automatic scrolling window
      const totalRows = profileFolders.length + 1;
      if (key.upArrow) setCursorIndex(prev => Math.max(0, prev - 1));
      if (key.downArrow) setCursorIndex(prev => Math.min(totalRows - 1, prev + 1));

      if (key.return && !profilesLoading && !profilesError) {
        if (cursorIndex === 0) {
          startLoginFlow(selectedProvider!, selectedMethod);
        } else {
          const folder = profileFolders[cursorIndex - 1];
          if (folder) startLoginFlow(selectedProvider!, selectedMethod, folder);
        }
      }
    }
    else if (step === "confirm-save") {
      if (key.return) handleConfirmSave();
    }
  });

  // ─── Render Helpers ───────────────────────────────────────────────────
  
  const renderHeader = () => (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="yellow">Add New Account</Text>
      <Text dimColor>Select a provider and authenticate to save credentials locally.</Text>
      {error && (
        <Box marginTop={0.5}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );

  const renderBreadcrumb = () => {
    const steps = ["Provider", "Method", "Profile", "Auth", "Save"];

    let currentIdx: number;
    if (step === "select-provider") currentIdx = 0;
    else if (step === "select-method") currentIdx = 1;
    else if (step === "select-profile") currentIdx = 2;
    else if (step === "initiating-login" || step === "waiting-auth") currentIdx = 3;
    else currentIdx = 4; // confirm-save
      
    return (
      <Box marginBottom={1}>
        {steps.map((s, i) => {
          const isActive = i === currentIdx;
          const label = isActive ? `[${s}]` : s;
          const color = isActive ? "cyanBright" : (i < currentIdx ? "cyan" : "gray");
          
          return (
            <React.Fragment key={s}>
              <Text color={color}>{label}</Text>
              {i < steps.length - 1 && <Text dimColor> → </Text>}
            </React.Fragment>
          );
        })}
      </Box>
    );
  };

  /**
   * Modern Minimalist Provider Row
   * No borders. Uses background highlight and accent colors for selection.
   */
  const ProviderRow = ({ provider, isSelected }: { provider: Provider; isSelected: boolean }) => {
    const isEnabled = provider.is_enabled !== false;
    const connType = provider.connection_type || "https";
    const connLabel = connType.toUpperCase();
    const methods = provider.authMethodsList;
    const domain = getDomain(provider.website_url || provider.website);
    
    // Colors
    const bgColor = isSelected ? "#1e293b" : undefined; // Slate-800 equivalent dark bg
    const textColor = isSelected ? "white" : (isEnabled ? "grayLight" : "grayDark");
    const markerColor = isSelected ? "cyanBright" : "grayDark";
    const badgeBg = isSelected ? "#0f172a" : "#1e293b";
    const badgeText = connType === "browser" ? "orangeBright" : "greenBright";

    return (
      <Box 
        backgroundColor={bgColor}
        paddingX={1}
        flexDirection="column"
        minHeight={3}
      >
        {/* Row 1: Marker + [Name  Domain] .............. [ConnBadge] */}
        <Box flexDirection="row" alignItems="center">
          <Text color={markerColor} bold={isSelected}>
            {isSelected ? "❯ " : "  "}
          </Text>

          {/* Left cluster: provider name + domain sát nhau */}
          <Box flexGrow={1} flexDirection="row" alignItems="baseline">
            <Text color={textColor} bold={isSelected}>
              {provider.provider_name}
            </Text>
            {domain && (
              <Box marginLeft={1}>
                <Text dimColor>{domain}</Text>
              </Box>
            )}
            {!isEnabled && (
              <Box marginLeft={1}>
                <Text color="yellow" bold italic>[Disabled]</Text>
              </Box>
            )}
          </Box>

          {/* Right: Connection badge (thay chỗ domain cũ) */}
          <Box flexShrink={0} marginLeft={1}>
            <Text
              color={badgeText}
              backgroundColor={badgeBg}
              bold
            >
              {" "}{connLabel}{" "}
            </Text>
          </Box>
        </Box>

        {/* Row 2: Description */}
        {provider.description && (
          <Box paddingLeft={2}>
            <Text dimColor wrap="truncate">
              {provider.description}
            </Text>
          </Box>
        )}

        {/* Row 3: Auth Method Badges */}
        {methods.length > 0 && (
          <Box paddingLeft={2} marginTop={provider.description ? 0 : 0}>
            {methods.map((m, idx) => (
              <Box key={m} marginRight={1}>
                <Text 
                  color={idx === 0 ? "cyan" : "gray"} 
                  backgroundColor={idx === 0 ? "#002233" : "#1a1a1a"}
                >
                   {m}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  // Helper for truncation inside component scope
  function truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.substring(0, maxLen - 1) + "…" : str;
  }

  // ─── Main Render ──────────────────────────────────────────────────────
  
  if (loading) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading providers...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={1}>
      {renderHeader()}
      {renderBreadcrumb()}
      
      <Box flexDirection="column" minHeight={15}>
        
        {/* STEP 1: SELECT PROVIDER (Scrolling Window) */}
        {step === "select-provider" && (
          <>
            <Box justifyContent="space-between" marginBottom={1}>
              <Text bold dimColor>Select a provider:</Text>
              <Text dimColor>{cursorIndex + 1}/{providers.length}</Text>
            </Box>
            
            <Box flexDirection="column">
              {visibleProviders.map((p, idx) => {
                const absoluteIdx = providerStart + idx;
                return (
                  <ProviderRow 
                    key={p.provider_id} 
                    provider={p} 
                    isSelected={absoluteIdx === cursorIndex} 
                  />
                );
              })}
              {providers.length === 0 && <Text dimColor>No providers found.</Text>}
            </Box>
          </>
        )}

        {/* STEP 2: SELECT METHOD */}
        {step === "select-method" && selectedProvider && (
          <>
            <Text bold>Provider: <Text color="cyan">{selectedProvider.provider_name}</Text></Text>
            <Box marginTop={1}>
              <Text dimColor>Select authentication method:</Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              {(selectedProvider.authMethodsList).map((m, idx) => {
                const isSelected = idx === cursorIndex;
                
                // Map descriptions similar to AddAccountDrawer.tsx
                const getMethodDesc = (method: string): string => {
                  switch (method.toLowerCase()) {
                    case "google": return "Sign in with your Google account via OAuth";
                    case "github": return "Sign in with your GitHub account via OAuth";
                    case "x": return "Sign in via device code — browser will open automatically";
                    case "basic": return "Enter your email and password directly — no OAuth required";
                    default: return `Sign in with ${method}`;
                  }
                };

                return (
                  <Box key={m} flexDirection="column" marginBottom={0.5}>
                    <Box flexDirection="row" alignItems="center">
                      <Text color={isSelected ? "cyanBright" : "gray"}>
                        {isSelected ? "❯ " : "  "}
                      </Text>
                      <Text color={isSelected ? "white" : "grayLight"} bold={isSelected}>
                        {m.toUpperCase()}
                      </Text>
                    </Box>
                    <Box paddingLeft={2}>
                      <Text dimColor wrap="truncate">
                        {getMethodDesc(m)}
                      </Text>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </>
        )}

        {/* STEP 2.5: SELECT CHROMIUM PROFILE (browser-based providers only) */}
        {step === "select-profile" && selectedProvider && (
          <>
            <Text bold>
              Provider: <Text color="cyan">{selectedProvider.provider_name}</Text>
              <Text dimColor> · Method: </Text>
              <Text color="magenta">{selectedMethod.toUpperCase()}</Text>
            </Text>
            <Box marginTop={1}>
              <Text dimColor>Select a Chromium profile:</Text>
            </Box>

            {profilesLoading && (
              <Box marginTop={1}>
                <Text dimColor>Loading profiles…</Text>
              </Box>
            )}

            {profilesError && !profilesLoading && (
              <Box marginTop={1}>
                <Text color="red">{profilesError}</Text>
              </Box>
            )}

            {!profilesLoading && !profilesError && (() => {
              const totalRows = profileFolders.length + 1; // row 0 = No profile

              // Scrolling window calculation
              let profileStart = 0;
              if (totalRows > PAGE_SIZE_PROFILES) {
                const half = Math.floor(PAGE_SIZE_PROFILES / 2);
                profileStart = cursorIndex - half;
                if (profileStart < 0) profileStart = 0;
                if (profileStart + PAGE_SIZE_PROFILES > totalRows) {
                  profileStart = Math.max(0, totalRows - PAGE_SIZE_PROFILES);
                }
              }
              const visibleCount = Math.min(PAGE_SIZE_PROFILES, totalRows - profileStart);
              const parent = profileBaseDir.split(/[\\/]+/).filter(Boolean).pop();

              return (
                <>
                  <Box justifyContent="space-between" marginTop={1}>
                    <Text dimColor>{profileBaseDir || "(no base dir)"}</Text>
                    <Text dimColor>{cursorIndex + 1}/{totalRows}</Text>
                  </Box>

                  <Box flexDirection="column" marginTop={1}>
                    {Array.from({ length: visibleCount }).map((_, idx) => {
                      const absoluteIdx = profileStart + idx;
                      const isSelected = absoluteIdx === cursorIndex;
                      const isNoProfile = absoluteIdx === 0;
                      const folder = isNoProfile ? undefined : profileFolders[absoluteIdx - 1];

                      return (
                        <Box key={absoluteIdx} backgroundColor={isSelected ? "#1e293b" : undefined} paddingX={1} flexDirection="column">
                          <Box flexDirection="row" alignItems="center">
                            <Text color={isSelected ? "cyanBright" : "grayDark"}>
                              {isSelected ? "❯ " : "  "}
                            </Text>
                            <Text color={isSelected ? "white" : "grayLight"} bold={isSelected}>
                              {isNoProfile ? "⊘  No profile" : folder}
                            </Text>
                          </Box>
                          <Box paddingLeft={2}>
                            <Text dimColor wrap="truncate">
                              {isNoProfile
                                ? "Login as default with a fresh browser window"
                                : parent ? `…/${parent}/${folder}` : `…/${folder}`}
                            </Text>
                          </Box>
                        </Box>
                      );
                    })}
                    {profileFolders.length === 0 && (
                      <Box paddingLeft={2}>
                        <Text dimColor italic>No profiles found in this directory.</Text>
                      </Box>
                    )}
                  </Box>
                </>
              );
            })()}
          </>
        )}

        {/* STEP 3: WAITING FOR AUTH (Device Code) */}
        {step === "waiting-auth" && pendingLogin && (
          <Box flexDirection="column" alignItems="center" marginTop={2}>
            <Text bold color="yellow">Waiting for authorization...</Text>
            
            <Box marginTop={1} borderStyle="single" borderColor="cyan" paddingX={2} paddingY={1}>
              <Text bold color="cyanBright">
                {pendingLogin.user_code}
              </Text>
            </Box>
            
            <Box marginTop={1}>
              <Text dimColor>Please visit this URL in your browser:</Text>
            </Box>
            <Box marginTop={1}>
               <Text color="blueUnderline">
                 {pendingLogin.verification_url}
               </Text>
            </Box>
            
            <Box marginTop={2}>
              <Text dimColor italic>Press Esc to cancel</Text>
            </Box>
          </Box>
        )}

        {/* STEP 4: CONFIRM SAVE */}
        {step === "confirm-save" && draftAccount && (() => {
          // Attempt to parse credential as JSON to display fields individually
          let credFields: Record<string, string> = {};
          try {
            const parsed = JSON.parse(draftAccount.credential);
            if (parsed && typeof parsed === 'object') {
              credFields = Object.entries(parsed).reduce((acc, [k, v]) => {
                acc[k] = String(v);
                return acc;
              }, {} as Record<string, string>);
            }
          } catch {
            // Not valid JSON, treat whole string as one field
            credFields["value"] = draftAccount.credential;
          }

          return (
            <Box flexDirection="column">
              <Text bold color="greenBright">Success! Account details captured.</Text>
              
              <Box marginTop={1} flexDirection="column" paddingLeft={2}>
                <Box>
                  <Box width={12}>
                    <Text dimColor>Provider: </Text>
                  </Box>
                  <Text>{draftAccount.provider_id}</Text>
                </Box>
                <Box>
                  <Box width={12}>
                    <Text dimColor>Email: </Text>
                  </Box>
                  <Text>{draftAccount.email || "(empty)"}</Text>
                </Box>
                <Box>
                  <Box width={12}>
                    <Text dimColor>Method: </Text>
                  </Box>
                  <Text>{draftAccount.auth_method}</Text>
                </Box>
                
                <Box flexDirection="column">
                  <Text dimColor>Credentials:</Text>
                  {Object.entries(credFields).map(([key, val]) => (
                    <Box key={key} paddingLeft={2}>
                      <Box width={16}>
                        <Text color="cyan">{key}: </Text>
                      </Box>
                      <Text color="magenta">
                        {val.length > 25 ? val.substring(0, 22) + "..." : val}
                      </Text>
                    </Box>
                  ))}
                </Box>
              </Box>
              
              {submitting && (
                <Box marginTop={1}>
                  <Text color="yellow">Saving to database...</Text>
                </Box>
              )}
            </Box>
          );
        })()}
        
        {/* LOADING STATE */}
        {step === "initiating-login" && (
          <Box marginTop={2}>
             <Text dimColor>Contacting server...</Text>
          </Box>
        )}

      </Box>

      {/* Footer Help — động theo step hiện tại */}
      <Box marginTop={1}>
        {step === "select-provider" ? (
          <Text dimColor>↑↓ select · Enter next · Esc(Ctrl+C) close</Text>
        ) : step === "confirm-save" ? (
          <Text dimColor>↑↓ select · Enter confirm · Esc(Ctrl+C) back</Text>
        ) : (
          <Text dimColor>↑↓ select · Enter next · Esc(Ctrl+C) back</Text>
        )}
      </Box>
    </Box>
  );
}