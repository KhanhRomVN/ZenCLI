import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";
import type { ConversationMetadata } from "../services/api";

interface HistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadConversation: (conversationId: string) => void;
}

/**
 * Reads conversation history from ~/.khanhromvn-zen/projects/{projectHash}/
 * following the storage architecture documented in temp/Zen/data-storage.md.
 */
export function History({
  isOpen,
  onClose,
  onLoadConversation,
}: HistoryProps): React.JSX.Element | null {
  const [conversations, setConversations] = useState<ConversationMetadata[]>(
    [],
  );
  const [cursorIndex, setCursorIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load conversations from filesystem
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

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

        if (!fs.existsSync(projectsDir)) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const entries = await fs.promises.readdir(projectsDir, {
          withFileTypes: true,
        });
        const history: ConversationMetadata[] = [];

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const conversationId = entry.name;
          const jsonPath = path.join(
            projectsDir,
            conversationId,
            `${conversationId}.json`,
          );

          if (!fs.existsSync(jsonPath)) continue;

          try {
            const content = await fs.promises.readFile(jsonPath, "utf-8");
            const data = JSON.parse(content);

            if (data.metadata) {
              history.push({
                id: conversationId,
                title: data.metadata.title || "Untitled",
                createdAt: data.metadata.createdAt || 0,
                lastModified: data.metadata.lastModified || 0,
                totalRequests: data.metadata.totalRequests,
                messageCount: data.messages?.length || 0,
              });
            }
          } catch {
            // Skip invalid files
          }
        }

        // Sort by lastModified descending
        history.sort((a, b) => b.lastModified - a.lastModified);
        setConversations(history.slice(0, 30)); // Limit to 30 per spec
      } catch {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isOpen]);

  // Reset cursor when reopened
  useEffect(() => {
    if (isOpen) setCursorIndex(0);
  }, [isOpen]);

  // Keyboard navigation
  useInput((input, key) => {
    if (!isOpen) return;

    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setCursorIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setCursorIndex((prev) => Math.min(conversations.length - 1, prev + 1));
      return;
    }

    if (key.return && conversations[cursorIndex]) {
      onLoadConversation(conversations[cursorIndex].id);
    }
  });

  if (!isOpen) return null;

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const d = date.getDate().toString().padStart(2, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const h = date.getHours().toString().padStart(2, "0");
    const min = date.getMinutes().toString().padStart(2, "0");
    return `${d}/${m} ${h}:${min}`;
  };

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        {"Conversation History"}
      </Text>
      <Text dimColor>{"View and restore previous sessions."}</Text>
      <Box flexDirection="column" marginTop={1}>
        {loading && <Text dimColor>Loading...</Text>}
        {!loading && conversations.length === 0 && (
          <Text dimColor>No conversations found</Text>
        )}
        {conversations.map((conv, i) => (
          <Box key={conv.id}>
            <Text color={i === cursorIndex ? "cyan" : undefined}>
              {i === cursorIndex ? "❯ " : "  "}
            </Text>
            <Box width={12}>
              <Text dimColor>{formatDate(conv.lastModified)}</Text>
            </Box>
            <Text>{conv.title.substring(0, 50)}</Text>
            {conv.messageCount !== undefined && (
              <Text dimColor>{` (${conv.messageCount} msgs)`}</Text>
            )}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{"↑↓ navigate · Enter load · Esc close"}</Text>
      </Box>
    </Box>
  );
}
