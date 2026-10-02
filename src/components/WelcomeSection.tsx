import React, { useState, useEffect } from "react";
import { Box, Text, useStdout } from "ink";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fetchStats, type StatsResponse } from "../services/api.js";

const pkgVersion: string = (() => {
  try {
    const pkgPath = resolve(__dirname, "../../../package.json");
    return JSON.parse(readFileSync(pkgPath, "utf-8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

interface WelcomeSectionProps {
  providerName: string;
  modelName: string;
  email: string;
  workspacePath: string;
}

// Helper format numbers like in Analytic.tsx
function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// ─── Installation Hint Component ────────────────────────────────────────
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

/**
 * ASCII art welcome banner displayed when no messages exist.
 * Wrapped in React.memo to prevent unnecessary re-renders during terminal resize events,
 * which causes visual artifacts (stacking/duplication) in Ink TUIs if the component tree updates too frequently.
 */
export const WelcomeSection = React.memo(function WelcomeSection({
  providerName,
  modelName,
  email,
  workspacePath,
}: WelcomeSectionProps): React.JSX.Element {
  const [stats, setStats] = useState<{
    totalTokens: number;
    totalRequests: number;
    favoriteModel: string;
  } | null>(null);

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
