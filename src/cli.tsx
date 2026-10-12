#!/usr/bin/env node
import { render } from "ink";
import { ThemeProvider, defaultTheme } from "@inkjs/ui";
import { App } from "./App.js";

// ── Parse --resume <conversationId> flag ──
// Used by Phantoma to force-load a specific session on boot.
const resumeArgIndex = process.argv.indexOf("--resume");
if (resumeArgIndex !== -1 && process.argv[resumeArgIndex + 1]) {
  const forcedConversationId = process.argv[resumeArgIndex + 1];
  // Pass via env var because Ink component tree props are hard to thread deep down.
  process.env.ZEN_FORCED_CONVERSATION_ID = forcedConversationId;
}

// ── NEW: Notify Phantoma when exiting gracefully or via signal ──
const notifyPhantomaExit = () => {
  // Write to stderr so it doesn't interfere with stdout if used for other purposes
  // Format matches what CodeTerminal.tsx expects
  process.stderr.write("\x1b[0m[PHANTOMA_EXIT]\n");
};

process.on("SIGINT", () => {
  notifyPhantomaExit();
  process.exit(0);
});

process.on("SIGTERM", () => {
  notifyPhantomaExit();
  process.exit(0);
});

// Also handle normal exit (e.g., /exit command)
process.on("beforeExit", () => {
  notifyPhantomaExit();
});

render(
  <ThemeProvider theme={defaultTheme}>
    <App />
  </ThemeProvider>,
  { exitOnCtrlC: false },
);
