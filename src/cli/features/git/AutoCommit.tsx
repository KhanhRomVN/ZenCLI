import React, { useState, useEffect } from "react";
import { Text, Box, useApp, useInput } from "ink";
import { exec } from "child_process";
import { promisify } from "util";
import chalk from "chalk";

const execAsync = promisify(exec);

interface AutoCommitProps {
  onExit: () => void;
}

export const AutoCommit: React.FC<AutoCommitProps> = ({ onExit }) => {
  const [status, setStatus] = useState<
    "loading" | "error" | "success" | "no-git"
  >("loading");
  const [message, setMessage] = useState<string>("");
  const [diff, setDiff] = useState<string>("");
  const { exit } = useApp();

  useEffect(() => {
    checkGitAndDiff();
  }, []);

  const checkGitAndDiff = async () => {
    try {
      // Check if .git exists
      try {
        await execAsync("git rev-parse --is-inside-work-tree");
      } catch (e) {
        setStatus("no-git");
        return;
      }

      // Get diff
      let diffOutput = "";
      try {
        const staged = await execAsync("git diff --cached");
        diffOutput = staged.stdout;

        if (!diffOutput.trim()) {
          const unstaged = await execAsync("git diff");
          diffOutput = unstaged.stdout;
        }
      } catch (e) {
        // Ignore
      }

      if (!diffOutput.trim()) {
        setStatus("error");
        setMessage("No changes detected in git repository.");
        return;
      }

      setDiff(
        diffOutput.substring(0, 500) + (diffOutput.length > 500 ? "..." : "")
      );

      // Simulate AI Generation (Placeholder for now)
      setStatus("success");
      setMessage("feat: update implementation of ZenCLI TUI features");
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">
        🤖 Auto Generator Commit Message
      </Text>
      <Text color="gray">{"─".repeat(50)}</Text>

      {status === "loading" && <Text>Analyzing git changes...</Text>}

      {status === "no-git" && (
        <Box flexDirection="column">
          <Text color="red">❌ Not a git repository</Text>
          <Text>This tool only works inside a git initialized folder.</Text>
        </Box>
      )}

      {status === "error" && (
        <Box flexDirection="column">
          <Text color="yellow">⚠️ {message}</Text>
        </Box>
      )}

      {status === "success" && (
        <Box flexDirection="column">
          <Text bold color="green">
            ✅ Generated Message:
          </Text>
          <Box borderStyle="round" borderColor="green" padding={1}>
            <Text>{message}</Text>
          </Box>

          <Box marginTop={1}>
            <Text bold color="blue">
              Based on changes:
            </Text>
          </Box>
          <Text color="gray">{diff}</Text>

          <Box marginTop={1}>
            <Text color="gray">[Simulated] Press Q to go back</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={2}>
        <Text color="gray">Press Esc or Q to return</Text>
      </Box>
    </Box>
  );
};
