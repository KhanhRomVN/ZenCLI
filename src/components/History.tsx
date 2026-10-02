import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";
import { exec } from "child_process";
import { logToFile } from "../services/api";

// Helper to open folder in system file manager
const openFolder = (folderPath: string) => {
  const platform = process.platform;
  let command = "";
  
  if (platform === "darwin") {
    command = `open "${folderPath}"`;
  } else if (platform === "win32") {
    command = `start "" "${folderPath}"`;
  } else {
    // Linux and others
    command = `xdg-open "${folderPath}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.error(`Error opening folder: ${error.message}`);
    }
  });
};

interface ConversationEntry {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  messageCount: number;
  totalTokens: number;
  providerId?: string;
  modelId?: string;
  sourceEnvironment?: "terminal" | "vscode-extension";
}

interface HistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadConversation: (conversationId: string) => void;
}

const PAGE_SIZE = 10;

/**
 * Formats a timestamp into a human-readable relative time string.
 * e.g., "2 minutes ago", "3 days ago"
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  
  if (diffMs < 0) return "just now";
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/**
 * Reads conversation history from ~/.khanhromvn-zen/projects/{projectHash}/
 */
export function History({
  isOpen,
  onClose,
  onLoadConversation,
}: HistoryProps): React.JSX.Element | null {
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0); // Global index across all pages
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Load conversations from filesystem
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setPage(0);
    setCursorIndex(0);

    const loadHistory = async () => {
      try {
        const cwd = process.cwd();
        const projectHash = crypto.createHash("md5").update(cwd).digest("hex");
        const projectsDir = path.join(
          os.homedir(),
          ".khanhromvn-zen",
          "projects",
          projectHash,
        );

        // [DEBUG] Log thông tin đường dẫn
        logToFile(`[HISTORY_DEBUG] Loading history from: ${projectsDir}`);
        logToFile(`[HISTORY_DEBUG] CWD: ${cwd}, Hash: ${projectHash}`);

        if (!fs.existsSync(projectsDir)) {
          logToFile(`[HISTORY_DEBUG] Directory does not exist. Returning empty.`);
          setConversations([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        const entries = await fs.promises.readdir(projectsDir, {
          withFileTypes: true,
        });
        
        logToFile(`[HISTORY_DEBUG] Found ${entries.length} entries in directory.`);
        
        const history: ConversationEntry[] = [];

        for (const entry of entries) {
          if (!entry.isDirectory()) {
             logToFile(`[HISTORY_DEBUG] Skipping non-directory: ${entry.name}`);
             continue;
          }
          
          const conversationId = entry.name;
          const jsonPath = path.join(
            projectsDir,
            conversationId,
            `${conversationId}.json`,
          );

          if (!fs.existsSync(jsonPath)) {
             logToFile(`[HISTORY_DEBUG] JSON not found for dir ${conversationId}: ${jsonPath}`);
             continue;
          }
          
          logToFile(`[HISTORY_DEBUG] Found valid conversation folder: ${conversationId}`);

          try {
            const content = await fs.promises.readFile(jsonPath, "utf-8");
            const data = JSON.parse(content);

            if (!data.metadata) {
               logToFile(`[HISTORY_DEBUG] Skipping ${conversationId}: No metadata found in JSON.`);
               continue;
            }

            // Extract provider/model from the first assistant message if available
            let providerId: string | undefined;
            let modelId: string | undefined;
            
            if (Array.isArray(data.messages)) {
              const firstAssistantMsg = data.messages.find((m: any) => m.role === "assistant");
              if (firstAssistantMsg) {
                providerId = firstAssistantMsg.providerId || firstAssistantMsg.provider_id;
                modelId = firstAssistantMsg.modelId || firstAssistantMsg.model_id;
              }
            }

            // Determine source environment; default to vscode-extension for backward compatibility
            const sourceEnv = data.metadata.sourceEnvironment === "terminal" 
              ? "terminal" 
              : "vscode-extension";

            logToFile(`[HISTORY_DEBUG] Successfully loaded conversation: ${conversationId} (${sourceEnv})`);

            history.push({
              id: conversationId,
              title: data.metadata.title || "Untitled",
              createdAt: data.metadata.createdAt || 0,
              lastModified: data.metadata.lastModified || 0,
              messageCount: data.messages?.length || 0,
              totalTokens: data.metadata.totalTokenUsage || 0,
              providerId,
              modelId,
              sourceEnvironment: sourceEnv,
            });
          } catch {
            // Skip invalid files
          }
        }

        // Sort by lastModified descending
        history.sort((a, b) => b.lastModified - a.lastModified);
        
        setTotalCount(history.length);
        // Store all in state, but only render current page slice
        setConversations(history); 
      } catch {
        setConversations([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isOpen]);

  // Calculate visible items based on pagination
  const startIndex = page * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const visibleConversations = conversations.slice(startIndex, endIndex);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Keyboard navigation
  useInput((input, key) => {
    if (!isOpen) return;

    // Support both Esc and Ctrl+C to close
    if (key.escape || (key.ctrl && input === "c")) {
      onClose();
      return;
    }

    // Left arrow: Previous Page
    if (key.leftArrow) {
      if (page > 0) {
        const newPage = page - 1;
        setPage(newPage);
        setCursorIndex(newPage * PAGE_SIZE);
      }
      return;
    }

    // Right arrow: Next Page
    if (key.rightArrow) {
      if (page < totalPages - 1) {
        const newPage = page + 1;
        setPage(newPage);
        setCursorIndex(newPage * PAGE_SIZE);
      }
      return;
    }

    if (key.upArrow) {
      const newIndex = Math.max(0, cursorIndex - 1);
      setCursorIndex(newIndex);
      // Switch page if moving up past the start of current page
      if (newIndex < startIndex && page > 0) {
        const newPage = page - 1;
        setPage(newPage);
        setCursorIndex(newPage * PAGE_SIZE + PAGE_SIZE - 1);
      }
      return;
    }

    if (key.downArrow) {
      const newIndex = Math.min(conversations.length - 1, cursorIndex + 1);
      setCursorIndex(newIndex);
      // Switch page if moving down past the end of current page
      if (newIndex >= endIndex && page < totalPages - 1) {
        const newPage = page + 1;
        setPage(newPage);
        setCursorIndex(newPage * PAGE_SIZE);
      }
      return;
    }

    if (key.return && conversations[cursorIndex]) {
      onLoadConversation(conversations[cursorIndex].id);
      return;
    }

    // Press 'o' to open the folder containing this conversation
    if (input === "o" && conversations[cursorIndex]) {
      const conv = conversations[cursorIndex];
      const cwd = process.cwd();
      const projectHash = crypto.createHash("md5").update(cwd).digest("hex");
      const folderPath = path.join(
        os.homedir(),
        ".khanhromvn-zen",
        "projects",
        projectHash,
        conv.id,
      );
      
      logToFile(`[HISTORY_DEBUG] Opening folder: ${folderPath}`);
      openFolder(folderPath);
    }
  });

  if (!isOpen) return null;

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        {"Conversation History"}
      </Text>
      <Text dimColor>{"View and restore previous sessions."}</Text>
      
      {/* Header Info */}
      <Box justifyContent="space-between" marginTop={1}>
        <Text dimColor>Page {page + 1} of {totalPages}</Text>
        <Text dimColor>Total: {totalCount}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {loading && <Text dimColor>Loading...</Text>}
        {!loading && totalCount === 0 && (
          <Text dimColor>No conversations found</Text>
        )}
        
        {visibleConversations.map((conv, i) => {
          const globalIndex = startIndex + i;
          const isSelected = globalIndex === cursorIndex;
          
          return (
            <Box key={conv.id} flexDirection="column">
              <Box>
                <Text color={isSelected ? "green" : "gray"}>
                  {isSelected ? "❯ " : "  "}
                </Text>
                
                {/* Time Column */}
                <Box width={10}>
                  <Text color={isSelected ? "cyanBright" : "gray"}>
                    {formatRelativeTime(conv.lastModified)}
                  </Text>
                </Box>

                {/* Title & Metadata Column */}
                <Box flexGrow={1} flexDirection="column">
                   <Text 
                     color={isSelected ? "cyanBright" : "white"} 
                     bold={isSelected}
                   >
                     {conv.title.substring(0, 55)}
                   </Text>
                   
                   <Box flexDirection="row" gap={1} alignItems="center">
                     <Text 
                       color={isSelected ? "magenta" : "gray"} 
                     >
                       {`${conv.messageCount} msgs • ${conv.totalTokens.toLocaleString()} token`}
                       {conv.providerId && conv.modelId ? ` • ${conv.providerId}/${conv.modelId}` : ""}
                     </Text>
                     
                     {/* Source Environment Badge */}
                     {conv.sourceEnvironment === "terminal" ? (
                       <Text color="cyan" dimColor={!isSelected}>
                         {" • Terminal"}
                       </Text>
                     ) : (
                       <Text color="magenta" dimColor={!isSelected}>
                         {" • VSCode"}
                       </Text>
                     )}
                   </Box>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>{"↑↓ navigate · ←→ page · Enter load · O open folder · Esc(Ctrl+C) close"}</Text>
      </Box>
    </Box>
  );
}