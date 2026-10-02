import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fetchAccounts, createAccount, type Account } from "../services/api.js";
import { logToFile } from "../services/api.js";

interface ImportAccountProps {
  onClose: () => void;
}

type EntryKind = "new" | "changed" | "identical" | "error";

interface ExistingAccountInfo {
  id: string;
  email: string;
  provider_id: string;
  credential: string | null;
}

interface ParsedEntry {
  email: string;
  provider_id: string;
  incomingCredential?: string;
  name?: string;
  kind: EntryKind;
  existing?: ExistingAccountInfo;
  reason?: string;
  selected: boolean;
}

// Helper to normalize comparison keys
const getKey = (email: string, providerId: string) =>
  `${providerId}|${email.toLowerCase().trim()}`;

function credentialsDiffer(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const normalize = (v: string | null | undefined) => {
    if (!v) return null;
    try {
      return JSON.stringify(JSON.parse(v));
    } catch {
      return v;
    }
  };
  return normalize(a) !== normalize(b);
}

// Helper to summarize long credentials for display
function summarizeCredential(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    const obj = JSON.parse(raw);
    const key = obj.accessToken || obj.access_token || obj.token || obj.cookie;
    if (key) {
      const s = String(key);
      return s.length > 32 ? `${s.slice(0, 12)}…${s.slice(-8)}` : s;
    }
    const first = Object.keys(obj)[0];
    if (first) {
      const s = String(obj[first]);
      return `${first}: ${s.length > 24 ? s.slice(0, 12) + "…" : s}`;
    }
    return raw.length > 32 ? `${raw.slice(0, 12)}…${raw.slice(-8)}` : raw;
  } catch {
    return raw.length > 32 ? `${raw.slice(0, 12)}…${raw.slice(-8)}` : raw;
  }
}

export function ImportAccount({
  onClose,
}: ImportAccountProps): React.JSX.Element {
  const [filePath, setFilePath] = useState("");
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null); // Track which row is expanded
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [step, setStep] = useState<"input" | "review">("input");
  const autoOpenedRef = useRef(false);

  // Auto-open file picker and load immediately on mount
  useEffect(() => {
    if (!autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openFilePickerAndLoad();
    }
  }, []);

  // Helper to normalize comparison keys
  const getKey = (email: string, providerId: string) =>
    `${providerId}|${email.toLowerCase().trim()}`;

  const openFilePickerAndLoad = async () => {
    try {
      // Using zenity for native GTK file selection dialog on Linux/Ubuntu
      const result = execSync(
        'zenity --file-selection --title="Select Accounts JSON File"',
        { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] },
      ).trim();

      if (result) {
        setFilePath(result);
        await loadAndParseFile(result);
      }
    } catch (err) {
      // User cancelled or error occurred
      if (err instanceof Error && !err.message.includes("cancelled")) {
         setMessage({ text: "Failed to read file via zenity.", type: "error" });
      }
    }
  };

  const loadAndParseFile = async (filePathToLoad: string) => {
    const absPath = path.resolve(filePathToLoad.trim());
    if (!fs.existsSync(absPath)) {
      setMessage({ text: `File not found: ${absPath}`, type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "Reading file...", type: "info" });
    try {
      const raw = fs.readFileSync(absPath, "utf-8");
      let data: any[] = [];

      // Support both array format and object with 'accounts' key
      const parsedJson = JSON.parse(raw);
      if (Array.isArray(parsedJson)) {
        data = parsedJson;
      } else if (parsedJson.accounts && Array.isArray(parsedJson.accounts)) {
        data = parsedJson.accounts;
      } else {
        throw new Error("Invalid JSON format.");
      }

      // Fetch existing accounts from DB to check duplicates and compare credentials
      const resp = await fetchAccounts({ limit: 9999 });

      // Map existing accounts by key for fast lookup
      const existingMap = new Map<string, ExistingAccountInfo>();
      resp.accounts.forEach((a) => {
        existingMap.set(getKey(a.email, a.provider_id), {
          id: a.id,
          email: a.email,
          provider_id: a.provider_id,
          credential: (a as any).credential ?? null,
        });
      });

      const parsedEntries: ParsedEntry[] = data.map((item: any) => {
        const email = item.email || "";
        const providerId = item.provider_id || "";
        const incomingCred = item.credential;

        if (!email || !providerId) {
          return {
            email,
            provider_id: providerId,
            incomingCredential: incomingCred,
            name: item.name,
            kind: "error",
            reason: "Missing email or provider_id",
            selected: false,
          };
        }

        const key = getKey(email, providerId);
        const existing = existingMap.get(key);

        if (!existing) {
          // New account
          return {
            email,
            provider_id: providerId,
            incomingCredential: incomingCred,
            name: item.name,
            kind: "new",
            selected: true, // Auto-select new ones
          };
        }

        // Account exists - check if credential differs
        const isChanged = credentialsDiffer(existing.credential, incomingCred);

        return {
          email,
          provider_id: providerId,
          incomingCredential: incomingCred,
          name: item.name,
          kind: isChanged ? "changed" : "identical",
          existing,
          reason: isChanged
            ? "Credential will be overridden"
            : "Identical - no changes",
          selected: isChanged, // Auto-select only changed ones
        };
      });

      setEntries(parsedEntries);
      setSelectedIndex(0);
      setExpandedIndex(null);
      setStep("review");
      setMessage(null);

      const newCount = parsedEntries.filter((e) => e.kind === "new").length;
      const changedCount = parsedEntries.filter(
        (e) => e.kind === "changed",
      ).length;
      logToFile(
        `ImportPreview: Total=${parsedEntries.length}, New=${newCount}, Changed=${changedCount}`,
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage({
        text: `Failed to read file: ${errMsg}`,
        type: "error",
      });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    const toProcess = entries.filter(
      (e) => e.selected && (e.kind === "new" || e.kind === "changed"),
    );

    if (toProcess.length === 0) {
      setMessage({ text: "No items selected for import.", type: "info" });
      return;
    }

    setLoading(true);

    const newCount = toProcess.filter((e) => e.kind === "new").length;
    const changedCount = toProcess.filter((e) => e.kind === "changed").length;

    let msgParts = [];
    if (newCount > 0) msgParts.push(`${newCount} new`);
    if (changedCount > 0)
      msgParts.push(`${changedCount} override`);

    setMessage({
      text: `Processing ${toProcess.length} accounts (${msgParts.join(", ")})...`,
      type: "info",
    });

    let successCount = 0;
    let failCount = 0;

    for (const entry of toProcess) {
      try {
        const ok = await createAccount({
          provider_id: entry.provider_id,
          email: entry.email,
          name: entry.name,
          credential: entry.incomingCredential,
        });

        if (ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setLoading(false);

    if (failCount === 0) {
      setMessage({
        text: `Successfully imported ${successCount} accounts.`,
        type: "success",
      });
      setTimeout(() => onClose(), 1500);
    } else {
      setMessage({
        text: `Import finished with errors. Success: ${successCount}, Failed: ${failCount}.`,
        type: "error",
      });
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (step === "review") {
        setStep("input");
        setEntries([]);
      } else {
        onClose();
      }
      return;
    }

    if (loading) return;

    if (step === "input") {
      // Ctrl+O to open native file picker via zenity
      if (key.ctrl && input === "o") {
        openFilePickerAndLoad();
        return;
      }
      if (key.return) {
        loadAndParseFile(filePath);
      } else if (key.backspace || key.delete) {
        setFilePath((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setFilePath((prev) => prev + input);
      }
    } else if (step === "review") {
      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(entries.length - 1, prev + 1));
      } else if (input === " ") {
        // Toggle selection using space character input
        const updated = [...entries];
        if (updated[selectedIndex]) {
          updated[selectedIndex].selected = !updated[selectedIndex].selected;
          setEntries(updated);
        }
      } else if (key.rightArrow) {
        // Expand details (Right Arrow is safe from IME interference)
        setExpandedIndex(selectedIndex);
      } else if (key.leftArrow) {
        // Collapse details (Left Arrow)
        setExpandedIndex(null);
      } else if (key.return) {
        handleConfirmImport();
      }
    }
  });

  const getStatusColor = (kind: EntryKind) => {
    switch (kind) {
      case "new":
        return "blue"; // Blue for New
      case "changed":
        return "yellow"; // Yellow for Changed/Override
      case "identical":
        return "gray"; // Gray for Identical
      case "error":
        return "red";
      default:
        return "white";
    }
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="yellow">
        Import Accounts
      </Text>
      <Text dimColor>Select a JSON file to import account credentials.</Text>

      {step === "input" && (
        <>
          <Box marginTop={1} marginBottom={1}>
            <Text color="cyan">File Path: </Text>
            <Text>
              {filePath || "_"}
              {!loading && <Text color="gray">█</Text>}
            </Text>
          </Box>

          {message && (
            <Box marginBottom={1}>
              <Text
                color={
                  message.type === "success"
                    ? "green"
                    : message.type === "error"
                      ? "red"
                      : "blue"
                }
              >
                {message.text}
              </Text>
            </Box>
          )}

          {loading && <Text dimColor>Loading...</Text>}

          <Box marginTop={1}>
            <Text dimColor>Press Enter to load, or Ctrl+O to browse files.</Text>
          </Box>
        </>
      )}

      {step === "review" && (
        <>
          <Box marginTop={1} marginBottom={1} justifyContent="space-between">
            <Text bold>
              Review: {entries.length} entries
            </Text>
            <Text dimColor>
              New: {entries.filter((e) => e.kind === "new").length} |{" "}
              Changed: {entries.filter((e) => e.kind === "changed").length} |{" "}
              Identical: {entries.filter((e) => e.kind === "identical").length} |{" "}
              Selected: {entries.filter((e) => e.selected).length}
            </Text>
          </Box>

          {message && (
            <Box marginBottom={1}>
              <Text
                color={
                  message.type === "success"
                    ? "green"
                    : message.type === "error"
                      ? "red"
                      : "blue"
                }
              >
                {message.text}
              </Text>
            </Box>
          )}

          <Box flexDirection="column" height={18} overflow="hidden">
            {entries.map((entry, idx) => {
              const isSelectedRow = idx === selectedIndex;
              const isChecked = entry.selected;
              const isExpanded = expandedIndex === idx;

              return (
                <React.Fragment
                  key={`${entry.provider_id}-${entry.email}-${idx}`}
                >
                  {/* Main Row */}
                  <Box flexDirection="row">
                    {/* Cursor Indicator */}
                    <Box width={3}>
                      <Text color={isSelectedRow ? "cyan" : "gray"}>
                        {isSelectedRow ? (isExpanded ? "▼ " : "▶ ") : "  "}
                      </Text>
                    </Box>

                    {/* Checkbox Visual */}
                    <Box width={4}>
                      <Text color={isChecked ? "green" : "gray"}>
                        [{isChecked ? "x" : " "}]
                      </Text>
                    </Box>

                    {/* Kind Badge */}
                    <Box width={12}>
                      <Text color={getStatusColor(entry.kind)}>
                        {entry.kind.toUpperCase()}
                      </Text>
                    </Box>

                    {/* Provider ID */}
                    <Box width={16}>
                      <Text bold wrap="truncate-end">
                        {entry.provider_id}
                      </Text>
                    </Box>

                    {/* Email */}
                    <Box flexGrow={1}>
                      <Text>{entry.email}</Text>
                    </Box>

                    {/* Reason (Optional) */}
                    {entry.reason && !isExpanded && (
                      <Box marginLeft={1}>
                        <Text dimColor italic>
                          ({entry.reason})
                        </Text>
                      </Box>
                    )}
                  </Box>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <Box flexDirection="column" marginLeft={7} marginBottom={1}>
                      {entry.kind === "new" && (
                        <>
                          <Text dimColor>This is a new account to be created.</Text>
                          <Text>
                            Credential: 
                            <Text color="cyan">
                              {summarizeCredential(entry.incomingCredential)}
                            </Text>
                          </Text>
                        </>
                      )}

                      {entry.kind === "identical" && (
                        <Text dimColor>No changes detected. Skipping.</Text>
                      )}

                      {entry.kind === "changed" && (
                        <>
                          <Box
                            flexDirection="row"
                            justifyContent="space-between"
                          >
                            <Text bold dimColor>
                              Field
                            </Text>
                            <Text bold dimColor>
                              Existing (DB)
                            </Text>
                            <Text bold dimColor>
                              Incoming (File)
                            </Text>
                          </Box>

                          {/* Email Diff */}
                          <Box
                            flexDirection="row"
                            justifyContent="space-between"
                          >
                            <Box width={10}>
                              <Text>Email</Text>
                            </Box>
                            <Box width={25}>
                              <Text color="gray">
                                {entry.existing?.email || "—"}
                              </Text>
                            </Box>
                            <Box width={25}>
                              <Text color="green">{entry.email}</Text>
                            </Box>
                          </Box>

                          {/* Credential Diff */}
                          <Box
                            flexDirection="row"
                            justifyContent="space-between"
                          >
                            <Box width={10}>
                              <Text>Cred</Text>
                            </Box>
                            <Box width={25}>
                              <Text color="red">
                                {summarizeCredential(
                                  entry.existing?.credential,
                                )}
                              </Text>
                            </Box>
                            <Box width={25}>
                              <Text color="green">
                                {summarizeCredential(entry.incomingCredential)}
                              </Text>
                            </Box>
                          </Box>
                        </>
                      )}

                      {entry.kind === "error" && (
                        <Text color="red">
                          Error: {entry.reason}
                        </Text>
                      )}
                    </Box>
                  )}
                </React.Fragment>
              );
            })}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              ↑↓ Navigate · Space Toggle Select · ←→ Expand/Collapse · Enter
              Import · Esc Back
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}
