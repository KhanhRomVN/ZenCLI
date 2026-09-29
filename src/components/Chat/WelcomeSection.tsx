import React from "react";
import { Box, Text } from "ink";
import { readFileSync } from "fs";
import { resolve } from "path";

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

/**
 * ASCII art welcome banner displayed when no messages exist.
 * Extracted from Chat.tsx for reuse and independent visibility control.
 */
export function WelcomeSection({
  providerName,
  modelName,
  email,
  workspacePath,
}: WelcomeSectionProps): React.JSX.Element {
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

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Text>
        <Text color="yellow">{"  ▄▄████▄▄    "}</Text>
        <Text bold color="white">Zen</Text>
        <Text color={secondaryColor}>{` v${pkgVersion}`}</Text>
      </Text>
      <Text>
        <Text color="yellow">{" █▀ "}</Text>
        <Text color="cyan">{"▄▄▄▄"}</Text>
        <Text color="yellow">{" ▀█   "}</Text>
        <Text color={secondaryColor}>{line2}</Text>
      </Text>
      <Text>
        <Text color="yellow">{"██ "}</Text>
        <Text color="cyan">{"█    █"}</Text>
        <Text color="yellow">{" ██  "}</Text>
        <Text color={secondaryColor}>{projectPath}</Text>
      </Text>
      <Text>
        <Text color="yellow">{" █▄ "}</Text>
        <Text color="cyan">{"▀▀▀▀"}</Text>
        <Text color="yellow">{" ▄█   "}</Text>
      </Text>
      <Text color="yellow">{"  ▀▀████▀▀    "}</Text>
    </Box>
  );
}