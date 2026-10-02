import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Message } from "../types/message";
import { logToFile, fetchStats, type StatsResponse } from "../services/api";

interface AnalyticProps {
  messages: Message[];
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/** Đếm số ký tự ≈ token (fallback nếu API lỗi). */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

interface ModelStat {
  key: string;
  label: string;
  requests: number;
  tokens: number;
}

/** Fallback logic: Tính toán từ local messages nếu API fail */
function collectLocalModelStats(messages: Message[]): ModelStat[] {
  const map = new Map<string, ModelStat>();
  for (const msg of messages) {
    if (
      msg.role !== "assistant" ||
      msg.uiHidden ||
      msg.isError ||
      msg.isCancelled
    )
      continue;

    const providerId = msg.providerId ?? "?";
    const modelId = msg.modelId ?? "unknown-model";
    const key = `${providerId}/${modelId}`;

    // Fix precedence: Calculate sum first, then fallback to total_tokens or estimation
    const promptCompSum =
      (msg.usage?.prompt_tokens ?? 0) + (msg.usage?.completion_tokens ?? 0);
    const realUsage = msg.usage?.total_tokens ?? promptCompSum;
    const tokens = realUsage > 0 ? realUsage : estimateTokens(msg.content);

    const existing = map.get(key);
    if (existing) {
      existing.requests += 1;
      existing.tokens += tokens;
    } else {
      map.set(key, { key, label: modelId, requests: 1, tokens });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.requests - a.requests);
}

/** Vẽ thanh bar chart ASCII đơn giản */
function renderBar(percent: number, width: number = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

// ─── Component ──────────────────────────────────────────────────────

export function Analytic({
  messages,
  onClose,
}: AnalyticProps): React.JSX.Element {
  const [statsData, setStatsData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats from backend API on mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchStats("day")
      .then((data) => {
        if (!data || !data.success) {
          throw new Error(
            data?.success === false ? "API returned failure" : "Empty response",
          );
        }
        setStatsData(data);
        logToFile(`Analytic fetched stats successfully.`);
      })
      .catch((err) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg);
        setStatsData(null);
        logToFile(
          `Analytic fetch error: ${errMsg}. Falling back to local calculation.`,
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Keyboard navigation
  useInput(
    (input, key) => {
      if (key.escape || (key.ctrl && input === "c")) onClose();
    },
    { isActive: true },
  );

  // ── Data Derivation ──

  let totalRequests = 0;
  let totalTokens = 0;
  let avgTokensPerReq = 0;
  let modelStatsList: ModelStat[] = [];
  let favoriteLabel = "—";
  let dataSource = "Backend API";

  if (statsData?.success && statsData.data) {
    const usage = statsData.data.usage || [];
    const models = statsData.data.models || [];

    totalRequests = usage.reduce((sum, u) => sum + (u.requests || 0), 0);
    totalTokens = usage.reduce((sum, u) => sum + (u.tokens || 0), 0);
    avgTokensPerReq =
      totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0;

    // Filter out unused models and sort
    modelStatsList = models
      .filter((m) => (m.total_requests ?? 0) > 0)
      .map((m) => ({
        key: `${m.provider_id}/${m.model_id}`,
        label: m.model_id,
        requests: m.total_requests ?? 0,
        tokens: m.total_tokens ?? 0,
      }))
      .sort((a, b) => b.requests - a.requests);

    if (modelStatsList.length > 0) {
      favoriteLabel = modelStatsList[0].label;
    }
  } else {
    // Fallback to local calculation
    dataSource = "Local Session (Fallback)";
    const assistantMessages = messages.filter(
      (m) =>
        m.role === "assistant" && !m.uiHidden && !m.isError && !m.isCancelled,
    );
    totalRequests = assistantMessages.length;
    totalTokens = assistantMessages.reduce((sum, m) => {
      const promptCompSum =
        (m.usage?.prompt_tokens ?? 0) + (m.usage?.completion_tokens ?? 0);
      const realUsage = m.usage?.total_tokens ?? promptCompSum;
      const estimated = estimateTokens(m.content);
      return sum + (realUsage > 0 ? realUsage : estimated);
    }, 0);
    avgTokensPerReq =
      totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0;
    modelStatsList = collectLocalModelStats(messages);
    favoriteLabel = modelStatsList[0]?.label ?? "—";
  }

  const grandTotal = modelStatsList.reduce((s, m) => s + m.requests, 0) || 1;

  // ── Render States ──

  if (loading) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="yellow">
          Session Analytics
        </Text>
        <Text dimColor>Loading statistics from backend...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingBottom={1}>
      {/* Header — Giữ nguyên phong cách cũ: Title + Description */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">
          Session Analytics
        </Text>
        <Text dimColor>
          Usage statistics for the current conversation session.
        </Text>
      </Box>

      {/* Key Metrics Grid with Labels */}
      <Box flexDirection="row" gap={1} marginBottom={1}>
        {/* Card 1: Total Tokens */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="green"
          paddingX={1}
          flexGrow={1}
        >
          <Text dimColor>Total Tokens Used</Text>
          <Text color="green" bold>
            {formatNumber(totalTokens)}
          </Text>
        </Box>

        {/* Card 2: Requests */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="blue"
          paddingX={1}
          flexGrow={1}
        >
          <Text dimColor>Total API Calls</Text>
          <Text color="blue" bold>
            {String(totalRequests)}
          </Text>
        </Box>

        {/* Card 3: Average */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="magenta"
          paddingX={1}
          flexGrow={1}
        >
          <Text dimColor>Avg Tokens / Call</Text>
          <Text color="magenta" bold>
            {formatNumber(avgTokensPerReq)}
          </Text>
        </Box>

        {/* Card 4: Favorite Model */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
          minWidth={25}
        >
          <Text dimColor>Most Used Model</Text>
          <Text color="yellow" bold wrap="truncate-end">
            {favoriteLabel}
          </Text>
        </Box>
      </Box>

      {/* Error Banner if fallback used due to API error */}
      {error && (
        <Box
          marginBottom={1}
          borderStyle="single"
          borderColor="red"
          paddingX={1}
        >
          <Text color="red" bold>
            ⚠ Backend Unavailable
          </Text>
          <Text dimColor>
            {" "}
            Using local session data only. Details: {error.slice(0, 50)}
          </Text>
        </Box>
      )}

      {/* Model Distribution Section */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>
          Model Usage Distribution
        </Text>

        {modelStatsList.length === 0 ? (
          <Box marginTop={1}>
            <Text dimColor>No model usage recorded for this period.</Text>
          </Box>
        ) : (
          <Box flexDirection="column" marginTop={1}>
            {modelStatsList.map((m) => {
              const pct = Math.round((m.requests / grandTotal) * 100);
              const bar = renderBar(pct, 30);

              return (
                <Box
                  key={m.key}
                  flexDirection="row"
                  alignItems="center"
                  gap={1}
                >
                  {/* Label Column */}
                  <Box width={20}>
                    <Text color="cyan" wrap="truncate-end">
                      {m.label}
                    </Text>
                  </Box>

                  {/* Bar Chart Column */}
                  <Box width={32}>
                    <Text>{bar}</Text>
                  </Box>

                  {/* Stats Column */}
                  <Box width={15} justifyContent="flex-end">
                    <Text dimColor>{`${pct}%`}</Text>
                  </Box>

                  <Box width={12} justifyContent="flex-end">
                    <Text color="gray">{`${m.requests} req`}</Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={2} justifyContent="space-between">
        <Text dimColor italic>
          Generated at {new Date().toLocaleTimeString()}
        </Text>
        <Text dimColor>[ESC] Close</Text>
      </Box>
    </Box>
  );
}
