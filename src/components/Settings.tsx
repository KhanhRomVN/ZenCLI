import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getApiUrl, setApiUrl, fetchDatabaseManagers, type DatabaseManagerRow } from "../services/api";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "general" | "feature" | "database";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "feature", label: "Feature" },
  { id: "database", label: "Database" },
];

// ─── Types for Local Config Storage ─────────────────────────────────────

interface AppConfig {
  apiUrl?: string;
  aiLanguage?: string;
  commitMessageLanguage?: string;
  permissionMode?: "approval" | "fullAccess";
  showMetadataBar?: boolean;
  activeDatabaseManagerId?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".khanhromvn-zen");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function readConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeConfig(config: AppConfig): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save config:", err);
  }
}

// ─── Constants ──────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "vi", name: "Vietnamese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "id", name: "Indonesian" },
  { code: "th", name: "Thai" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "sv", name: "Swedish" },
  { code: "no", name: "Norwegian" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "uk", name: "Ukrainian" },
  { code: "cs", name: "Czech" },
  { code: "ro", name: "Romanian" },
];
const PERMISSION_OPTIONS = [
  { value: "approval", label: "Ask for approval", desc: "Agent must ask before writing/deleting files or running commands." },
  { value: "fullAccess", label: "Full access", desc: "Agent can read/write/delete/run automatically without asking." },
] as const;

// ─── Helper Components ──────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; color?: string }> = ({ title, color = "cyan" }) => (
  <Box marginTop={1} marginBottom={0}>
    <Text bold color={color}>{title}</Text>
  </Box>
);

const ToggleItem: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  isSelected: boolean;
}> = ({ label, description, checked, isSelected }) => (
  <Box flexDirection="column" marginLeft={isSelected ? 0 : 2}>
    <Box>
      <Text color={isSelected ? "green" : "gray"}>{isSelected ? "❯ " : "  "}</Text>
      <Text color={isSelected ? "white" : "gray"} bold={isSelected}>
        {label} [{checked ? "ON" : "OFF"}]
      </Text>
    </Box>
    <Box paddingLeft={4}>
      <Text dimColor wrap="wrap">{description}</Text>
    </Box>
  </Box>
);

const RadioItem: React.FC<{
  label: string;
  description: string;
  selected: boolean;
  isActive: boolean;
}> = ({ label, description, selected, isActive }) => (
  <Box flexDirection="column" marginLeft={isActive ? 0 : 2}>
    <Box>
      <Text color={isActive ? "green" : "gray"}>{isActive ? "❯ " : "  "}</Text>
      <Text color={isActive ? "white" : "gray"} bold={isActive}>
        {selected ? "(*) " : "( ) "}
        {label}
      </Text>
    </Box>
    <Box paddingLeft={4}>
      <Text dimColor wrap="wrap">{description}</Text>
    </Box>
  </Box>
);

// ─── Main Component ─────────────────────────────────────────────────────

export function Settings({
  isOpen,
  onClose,
}: SettingsProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  
  // General State
  const [apiUrlInput, setApiUrlInput] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [aiLangIndex, setAiLangIndex] = useState(0);
  const [commitLangIndex, setCommitLangIndex] = useState(0);
  const [selectingLang, setSelectingLang] = useState<"ai" | "commit" | null>(null);

  // Feature State
  const [permissionMode, setPermissionMode] = useState<"approval" | "fullAccess">("approval");
  const [showMetadataBar, setShowMetadataBar] = useState(true);
  const [featureCursor, setFeatureCursor] = useState(0); // 0: perm, 1: meta

  // Database State
  const [dbManagers, setDbManagers] = useState<DatabaseManagerRow[]>([]);
  const [activeDbId, setActiveDbId] = useState<string | undefined>();
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbCursor, setDbCursor] = useState(0);

  // Navigation Cursor for General Tab Items
  const [generalCursor, setGeneralCursor] = useState(0); // 0: URL, 1: AI Lang, 2: Commit Lang

  // Load initial data
  useEffect(() => {
    if (!isOpen) return;
    
    const config = readConfig();
    setApiUrlInput(getApiUrl());
    setPermissionMode((config.permissionMode as any) || "approval");
    setShowMetadataBar(config.showMetadataBar !== false);
    setActiveDbId(config.activeDatabaseManagerId);
    
    // Find indices for languages
    const aiIdx = LANGUAGES.findIndex(l => l.code === (config.aiLanguage || "en"));
    const cmIdx = LANGUAGES.findIndex(l => l.code === (config.commitMessageLanguage || "en"));
    setAiLangIndex(aiIdx >= 0 ? aiIdx : 0);
    setCommitLangIndex(cmIdx >= 0 ? cmIdx : 0);

    // Reset cursors
    setGeneralCursor(0);
    setFeatureCursor(0);
    setDbCursor(0);
    setSelectingLang(null);
    setEditingUrl(false);
    setDbError(null);

    loadDatabaseManagers(config.activeDatabaseManagerId);
  }, [isOpen]);

  const loadDatabaseManagers = async (currentActiveId?: string) => {
    setDbLoading(true);
    setDbError(null);
    try {
      const managers = await fetchDatabaseManagers(currentActiveId);
      setDbManagers(managers);
      
      // Auto-select first routable manager if none selected or current one invalid
      if (managers.length > 0) {
        const isCurrentValid = managers.some(m => m.id === currentActiveId);
        if (!currentActiveId || !isCurrentValid) {
          const firstRoutable = managers.find(m => 
            m.type === "local-file" || 
            (m.type === "connection" && m.db_type === "postgres")
          );
          if (firstRoutable) {
            setActiveDbId(firstRoutable.id);
          }
        }
      }
    } catch (err) {
      setDbError(err instanceof Error ? err.message : "Failed to load databases");
    } finally {
      setDbLoading(false);
    }
  };

  const saveConfig = () => {
    const currentConfig = readConfig();
    writeConfig({
      ...currentConfig,
      permissionMode,
      showMetadataBar,
      aiLanguage: LANGUAGES[aiLangIndex]?.code,
      commitMessageLanguage: LANGUAGES[commitLangIndex]?.code,
      activeDatabaseManagerId: activeDbId,
    });
  };

  useInput((input, key) => {
    if (!isOpen) return;

    const isCloseKey = key.escape || (key.ctrl && input === "c");

    // Handle Close/Esc/Ctrl+C: Cancel sub-states first, otherwise close settings
    if (isCloseKey) {
      if (editingUrl) {
        setEditingUrl(false);
        setApiUrlInput(getApiUrl()); // Revert input
        return;
      }
      if (selectingLang) {
        setSelectingLang(null);
        return;
      }
      onClose();
      return;
    }

    // Handle Sub-states first
    
    // 1. Editing URL
    if (editingUrl) {
      if (key.return) {
        setApiUrl(apiUrlInput);
        saveConfig();
        setEditingUrl(false);
      } else if (key.backspace || key.delete) {
        setApiUrlInput(prev => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setApiUrlInput(prev => prev + input);
      }
      return;
    }

    // 2. Selecting Language
    if (selectingLang) {
      if (key.upArrow) {
        if (selectingLang === "ai") {
          setAiLangIndex(prev => Math.max(0, prev - 1));
        } else {
          setCommitLangIndex(prev => Math.max(0, prev - 1));
        }
        return;
      }
      if (key.downArrow) {
        if (selectingLang === "ai") {
          setAiLangIndex(prev => Math.min(LANGUAGES.length - 1, prev + 1));
        } else {
          setCommitLangIndex(prev => Math.min(LANGUAGES.length - 1, prev + 1));
        }
        return;
      }
      if (key.return) {
        saveConfig();
        setSelectingLang(null);
      }
      return;
    }

    // Tab Navigation
    if (key.leftArrow || key.rightArrow) {
      const currentIndex = TABS.findIndex(t => t.id === activeTab);
      let nextIndex = currentIndex;
      if (key.rightArrow) nextIndex++;
      if (key.leftArrow) nextIndex--;
      
      // Wrap around
      if (nextIndex >= TABS.length) nextIndex = 0;
      if (nextIndex < 0) nextIndex = TABS.length - 1;
      
      setActiveTab(TABS[nextIndex].id);
      // Reset cursors when switching tabs
      setGeneralCursor(0);
      setFeatureCursor(0);
      setDbCursor(0);
      return;
    }

    // Content Navigation based on Active Tab
    if (activeTab === "general") {
      const maxCursor = 2; // 0: URL, 1: AI Lang, 2: Commit Lang
      
      if (key.upArrow) {
        setGeneralCursor(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setGeneralCursor(prev => Math.min(maxCursor, prev + 1));
        return;
      }
      if (key.return) {
        if (generalCursor === 0) {
          setEditingUrl(true);
        } else if (generalCursor === 1) {
          setSelectingLang("ai");
        } else if (generalCursor === 2) {
          setSelectingLang("commit");
        }
      }
      return;
    }

    if (activeTab === "feature") {
      const maxCursor = 1; // 0: Permission Mode, 1: Metadata Bar
      
      if (key.upArrow) {
        setFeatureCursor(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setFeatureCursor(prev => Math.min(maxCursor, prev + 1));
        return;
      }
      if (key.return) {
        if (featureCursor === 0) {
          // Cycle permission modes
          setPermissionMode(prev => prev === "approval" ? "fullAccess" : "approval");
          saveConfig();
        } else if (featureCursor === 1) {
          // Toggle metadata bar
          setShowMetadataBar(prev => !prev);
          saveConfig();
        }
      }
      return;
    }

    if (activeTab === "database") {
      if (dbManagers.length === 0) return;

      if (key.upArrow) {
        setDbCursor(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setDbCursor(prev => Math.min(dbManagers.length - 1, prev + 1));
        return;
      }
      if (key.return) {
        const selected = dbManagers[dbCursor];
        if (selected) {
          setActiveDbId(selected.id);
          saveConfig();
        }
      }
      return;
    }
  });

  if (!isOpen) return null;

  // ─── Render Helpers ───────────────────────────────────────────────────

  const renderGeneralTab = () => {
    const currentAiLang = LANGUAGES[aiLangIndex];
    const currentCommitLang = LANGUAGES[commitLangIndex];

    return (
      <Box flexDirection="column">
        <SectionHeader title="Backend Connection" />
        
        {/* Item 0: Backend URL */}
        <Box>
          <Text color={generalCursor === 0 ? "green" : "gray"}>
            {generalCursor === 0 ? "❯ " : "  "}
          </Text>
          <Text>API URL: </Text>
          {editingUrl ? (
             <Text color="green">{apiUrlInput}|</Text>
          ) : (
             <Text>{getApiUrl()}</Text>
          )}
        </Box>
        {editingUrl && (
           <Box paddingLeft={4}><Text dimColor>Type new URL · Enter save · Esc cancel</Text></Box>
        )}

        <SectionHeader title="Language" />

        {/* Item 1: AI Language */}
        <Box>
          <Text color={generalCursor === 1 ? "green" : "gray"}>
            {generalCursor === 1 ? "❯ " : "  "}
          </Text>
          <Text>AI Response Language: </Text>
          {selectingLang === "ai" ? (
            <Box flexDirection="column">
               {LANGUAGES.map((lang, idx) => (
                 <Text key={lang.code} color={idx === aiLangIndex ? "cyanBright" : "gray"} bold={idx === aiLangIndex}>
                   {idx === aiLangIndex ? "  > " : "    "} {lang.name}
                 </Text>
               ))}
            </Box>
          ) : (
            <Text>{currentAiLang?.name}</Text>
          )}
        </Box>
        {selectingLang === "ai" && (
           <Box paddingLeft={4}><Text dimColor>↑↓ select · Enter confirm · Esc cancel</Text></Box>
        )}

        {/* Item 2: Commit Message Language */}
        <Box marginTop={1}>
          <Text color={generalCursor === 2 ? "green" : "gray"}>
            {generalCursor === 2 ? "❯ " : "  "}
          </Text>
          <Text>Commit Message Language: </Text>
          {selectingLang === "commit" ? (
            <Box flexDirection="column">
               {LANGUAGES.map((lang, idx) => (
                 <Text key={lang.code} color={idx === commitLangIndex ? "cyanBright" : "gray"} bold={idx === commitLangIndex}>
                   {idx === commitLangIndex ? "  > " : "    "} {lang.name}
                 </Text>
               ))}
            </Box>
          ) : (
            <Text>{currentCommitLang?.name}</Text>
          )}
        </Box>
        {selectingLang === "commit" && (
           <Box paddingLeft={4}><Text dimColor>↑↓ select · Enter confirm · Esc cancel</Text></Box>
        )}
      </Box>
    );
  };

  const renderFeatureTab = () => {
    return (
      <Box flexDirection="column">
        <SectionHeader title="Agent Permission" color="blue" />
        <RadioItem 
          label={PERMISSION_OPTIONS[0].label} 
          description={PERMISSION_OPTIONS[0].desc}
          selected={permissionMode === "approval"}
          isActive={featureCursor === 0}
        />
        <RadioItem 
          label={PERMISSION_OPTIONS[1].label} 
          description={PERMISSION_OPTIONS[1].desc}
          selected={permissionMode === "fullAccess"}
          isActive={false} // Visual only, interaction handled by parent cursor
        />
        
        <SectionHeader title="Conversation" color="magenta" />
        <ToggleItem 
          label="Show MetadataBar"
          description="Display token usage and response stats below each AI message."
          checked={showMetadataBar}
          isSelected={featureCursor === 1}
        />
      </Box>
    );
  };

  const renderDatabaseTab = () => {
    if (dbLoading) {
      return <Text dimColor>Loading database managers...</Text>;
    }
    
    if (dbError) {
      return (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">Error: {dbError}</Text>
          <Text dimColor>Check backend connection in General tab.</Text>
        </Box>
      );
    }

    if (dbManagers.length === 0) {
      return (
        <Box flexDirection="column" alignItems="center" marginTop={2}>
          <Text dimColor>No database managers found.</Text>
          <Text dimColor>Add one via the Zen VSCode extension or ensure backend is running.</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <SectionHeader title="Database Managers" color="yellow" />
        <Text dimColor>Select a manager to set as active for this workspace.</Text>
        
        {dbManagers.map((mgr, idx) => {
          const isActive = mgr.id === activeDbId;
          const isSelected = idx === dbCursor;
          
          // Determine target string based on type
          let targetStr = "";
          if (mgr.type === "local-file") {
            targetStr = mgr.file_path || "No path";
          } else if (mgr.type === "connection") {
            targetStr = `${mgr.host || "?"}:${mgr.port || "?"}/${mgr.database_name || "?"}`;
          }

          // Status indicator from last_test_status
          let statusColor = "gray";
          let statusText = "idle";
          if (mgr.last_test_status === "success") {
            statusColor = "green";
            statusText = "connected";
          } else if (mgr.last_test_status === "error") {
            statusColor = "red";
            statusText = "failed";
          }

          return (
            <Box key={mgr.id} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color={isSelected ? "green" : "gray"}>
                  {isSelected ? "❯ " : "  "}
                </Text>
                <Text 
                  color={isActive ? "cyanBright" : "white"} 
                  bold={isActive}
                >
                  {mgr.name}
                </Text>
                {isActive && <Text color="green"> [ACTIVE]</Text>}
              </Box>
              
              <Box paddingLeft={4}>
                <Text dimColor>Type: </Text>
                <Text>{mgr.type}{mgr.db_type ? ` (${mgr.db_type})` : ""}</Text>
                
                <Text dimColor> | Target: </Text>
                <Text>{targetStr}</Text>
                
                <Text dimColor> | Status: </Text>
                <Text color={statusColor}>{statusText}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Settings</Text>
      <Text dimColor>{"Configure application preferences."}</Text>

      {/* Tab Bar */}
      <Box marginTop={1} marginBottom={1}>
        {TABS.map((tab) => (
          <Box key={tab.id} marginRight={2}>
            <Text
              color={activeTab === tab.id ? "cyanBright" : "gray"}
              bold={activeTab === tab.id}
            >
              {activeTab === tab.id ? `[${tab.label}]` : tab.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column" minHeight={15}>
        {activeTab === "general" && renderGeneralTab()}
        {activeTab === "feature" && renderFeatureTab()}
        {activeTab === "database" && renderDatabaseTab()}
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>{"←→ switch tabs · ↑↓ navigate · Enter edit/select · Esc(Ctrl+C) close"}</Text>
      </Box>
    </Box>
  );
}