/**
 * ------------------------------------------------------------------
 * Welcome Section
 * ------------------------------------------------------------------
 * Màn hình chào mừng hiển thị khi chưa có tin nhắn nào trong phiên chat.
 * Bao gồm logo ASCII, thông tin phiên bản, đường dẫn dự án, thống kê sử dụng
 * và hướng dẫn cài đặt backend nếu cần thiết.
 *
 * Main features:
 * - Hiển thị logo ASCII nghệ thuật của ZenCLI
 * - Thông tin phiên bản tự động đọc từ package.json
 * - Thống kê token/request/model yêu thích từ API backend
 * - Hướng dẫn cài đặt AIWeb2API và VSCode Extension nếu thiếu
 * - Tối ưu hóa render bằng React.memo để tránh flicker khi resize terminal
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useState, useEffect } from "react";

// ── UI ─
import { Box, Text, useStdout } from "ink";

// ── Node FS ──
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Services ──
import { fetchStats, type StatsResponse } from "../services/api.js";

// ─── Constants ──────────────────────────────────────────────────────────
const pkgVersion: string = (() => {
  try {
    const pkgPath = resolve(__dirname, "../../../package.json");
    return JSON.parse(readFileSync(pkgPath, "utf-8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

// ─── Helpers ────────────────────────────────────────────────────────────
// Helper format numbers like in Analytic.tsx
function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// ─── Sub-Components ─────────────────────────────────────────────────────
/**
 * InstallationHint
 * ------------------------------------------------------------------
 * Hộp thoại gợi ý cài đặt khi backend chưa sẵn sàng hoặc đề xuất mở rộng VSCode.
 * Tự động điều chỉnh chiều rộng dựa trên kích thước terminal.
 */
const InstallationHint = () => {
  const { stdout } = useStdout();
  // Subtract 2 chars to account for potential rendering quirks or implicit margins
  // ensuring no line-wrapping occurs due to overflow.
  const width = (stdout?.columns ?? 80) - 2;
  const separator = "─".repeat(Math.max(0, width));

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Top Separator */}
      <Text color="blue">{separator}</Text>

      <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
        <Text bold color="blueBright">
          Setup Required
        </Text>
        <Box flexDirection="column">
          <Text wrap="wrap">
            ZenCLI requires the{" "}
            <Text color="cyan" bold>
              AIWeb2API
            </Text>{" "}
            server to be running locally. Please install and start it first.
          </Text>
          <Text dimColor>GitHub: https://github.com/KhanhRomVN/AIWeb2API</Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text bold color="magentaBright">
            Pro Tip
          </Text>
          <Text wrap="wrap">
            For a better experience with GUI controls, try the official{" "}
            <Text color="cyan" bold>
              Zen VSCode Extension
            </Text>
            .
          </Text>
          <Text dimColor>
            Install:
            https://marketplace.visualstudio.com/items?itemName=khanhromvn.khanhromvn-zen
          </Text>
        </Box>
      </Box>

      {/* Bottom Separator */}
      <Text color="blue">{separator}</Text>
    </Box>
  );
};

// ─── Interfaces ────────────────────────────────────────────────────────
interface WelcomeSectionProps {
  providerName: string;
  modelName: string;
  email: string;
  workspacePath: string;
}

// ─── Component ─────────────────────────────────────────────────────────
/**
 * WelcomeSection
 * ------------------------------------------------------------------
 * Component chính hiển thị màn hình chào mừng.
 * Được bọc trong React.memo để tối ưu hiệu suất khi terminal thay đổi kích thước.
 */
export const WelcomeSection = React.memo(function WelcomeSection({
  providerName,
  modelName,
  email,
  workspacePath,
}: WelcomeSectionProps): React.JSX.Element {
  // ── State ──
  const [stats, setStats] = useState<{
    totalTokens: number;
    totalRequests: number;
    favoriteModel: string;
  } | null>(null);

  // ── Effects ──
  useEffect(() => {
    fetchStats("day")
      .then((data: StatsResponse | null) => {
        if (!data?.success || !data.data) return;

        const usage = data.data.usage || [];
        const models = data.data.models || [];

        const totalRequests = usage.reduce(
          (sum, u) => sum + (u.requests || 0),
          0,
        );
        const totalTokens = usage.reduce((sum, u) => sum + (u.tokens || 0), 0);

        // Find most used model by requests
        const sortedModels = [...models].sort(
          (a, b) => (b.total_requests ?? 0) - (a.total_requests ?? 0),
        );
        const favoriteModel = sortedModels[0]?.model_id ?? "—";

        setStats({ totalTokens, totalRequests, favoriteModel });
      })
      .catch(() => {
        // Silently fail or set default zeros if needed, but keeping null hides the line initially
        setStats({ totalTokens: 0, totalRequests: 0, favoriteModel: "—" });
      });
  }, []);

  // ── Derived ─
  const hasSelection = modelName !== "-";
  const displayEmail = email !== "-" ? email : "";
  const line2 = hasSelection
    ? `${providerName}/${modelName}${displayEmail ? ` ${displayEmail}` : ""}`
    : "Select a model & account to start chatting (/model-account)";

  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const projectPath =
    homeDir && workspacePath.startsWith(homeDir)
      ? "~" + workspacePath.slice(homeDir.length)
      : workspacePath;

  const secondaryColor = "gray";

  // Construct stats line
  let statsLine = "";
  if (stats) {
    statsLine = `Token: ${formatNumber(stats.totalTokens)} Req: ${stats.totalRequests} Favorite: ${stats.favoriteModel}`;
  } else {
    statsLine = "Loading stats...";
  }

  // ── Render ──
  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Text>
        <Text color="yellow">{"  ▄▄██▄▄    "}</Text>
        <Text bold color="white">
          ZenCLI
        </Text>
        <Text color={secondaryColor}>{` v${pkgVersion}`}</Text>
      </Text>
      <Text>
        <Text color="yellow">{" █▀ "}</Text>
        <Text color="cyan">{"▄▄"}</Text>
        <Text color="yellow">{" ▀█   "}</Text>
        <Text color={secondaryColor}>{line2}</Text>
      </Text>
      <Text>
        <Text color="yellow">{"██ "}</Text>
        <Text color="cyan">{"█  █"}</Text>
        <Text color="yellow">{" ██  "}</Text>
        <Text color={secondaryColor}>{projectPath}</Text>
      </Text>
      <Text>
        <Text color="yellow">{" █▄ "}</Text>
        <Text color="cyan">{"▀▀"}</Text>
        <Text color="yellow">{" ▄█   "}</Text>
        <Text color={secondaryColor}>{statsLine}</Text>
      </Text>
      <Text color="yellow">{"  ▀▀██▀▀    "}</Text>

      <InstallationHint />
    </Box>
  );
});
