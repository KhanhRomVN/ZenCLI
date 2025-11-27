// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import assert from "node:assert";
import * as vscode from "vscode";
// WebviewProvider removed for CLI-only build
import { Logger } from "./services/logging/Logger";
import "./utils/path"; // necessary to have access to String.prototype.toPosix

import { tearDown } from "./common";
import { HookDiscoveryCache } from "./core/hooks/HookDiscoveryCache";
import { HookProcessRegistry } from "./core/hooks/HookProcessRegistry";
import { ExtensionRegistryInfo } from "./registry";
import { AuthService } from "./services/auth/AuthService";
import { LogoutReason } from "./services/auth/types";
import { telemetryService } from "./services/telemetry";
import { SharedUriHandler } from "./services/uri/SharedUriHandler";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  Logger.log("Cline extension activated");

  // Initialize hook discovery cache for performance optimization
  HookDiscoveryCache.getInstance().initialize(
    context as any, // Adapt VSCode ExtensionContext to generic interface
    (dir: string) => {
      try {
        const pattern = new vscode.RelativePattern(dir, "*");
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        // Adapt VSCode FileSystemWatcher to generic interface
        return {
          onDidCreate: (listener: () => void) => watcher.onDidCreate(listener),
          onDidChange: (listener: () => void) => watcher.onDidChange(listener),
          onDidDelete: (listener: () => void) => watcher.onDidDelete(listener),
          dispose: () => watcher.dispose(),
        };
      } catch {
        return null;
      }
    },
    (callback: () => void) => {
      // Adapt VSCode Disposable to generic interface
      return vscode.workspace.onDidChangeWorkspaceFolders(callback);
    }
  );

  vscode.commands.executeCommand(
    "setContext",
    "cline.isDevMode",
    IS_DEV && IS_DEV === "true"
  );

  const { commands } = ExtensionRegistryInfo;

  const handleUri = async (uri: vscode.Uri) => {
    const url = decodeURIComponent(uri.toString());
    const success = await SharedUriHandler.handleUri(url);
    if (!success) {
      console.warn(
        "Extension URI handler: Failed to process URI:",
        uri.toString()
      );
    }
  };
  context.subscriptions.push(vscode.window.registerUriHandler({ handleUri }));

  // Register the openWalkthrough command handler
  context.subscriptions.push(
    vscode.commands.registerCommand(commands.Walkthrough, async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openWalkthrough",
        `${context.extension.id}#ClineWalkthrough`
      );
      telemetryService.captureButtonClick("command_openWalkthrough");
    })
  );

  // Register the reconstructTaskHistory command handler
  context.subscriptions.push(
    vscode.commands.registerCommand(
      commands.ReconstructTaskHistory,
      async () => {
        const { reconstructTaskHistory } = await import(
          "./core/commands/reconstructTaskHistory"
        );
        await reconstructTaskHistory();
        telemetryService.captureButtonClick("command_reconstructTaskHistory");
      }
    )
  );

  // Register the generateGitCommitMessage command handler
  context.subscriptions.push(
    vscode.commands.registerCommand(commands.GenerateCommit, async (scm) => {
      // Webview functionality removed for CLI-only build
      console.log("Generate commit message - webview functionality removed");
    })
  );

  context.subscriptions.push(
    context.secrets.onDidChange(async (event) => {
      if (event.key === "cline:clineAccountId") {
        // Check if the secret was removed (logout) or added/updated (login)
        const secretValue = await context.secrets.get(event.key);
        // Webview functionality removed for CLI-only build
        const authService = AuthService.getInstance();
        if (secretValue) {
          // Secret was added or updated - restore auth info (login from another window)
          authService?.restoreRefreshTokenAndRetrieveAuthInfo();
        } else {
          // Secret was removed - handle logout for all windows
          authService?.handleDeauth(LogoutReason.CROSS_WINDOW_SYNC);
        }
      }
    })
  );
}

// This method is called when your extension is deactivated
export async function deactivate() {
  Logger.log("Cline extension deactivating, cleaning up resources...");

  tearDown();

  // Kill any running hook processes to prevent zombies
  await HookProcessRegistry.terminateAll();

  // Clean up hook discovery cache
  HookDiscoveryCache.getInstance().dispose();

  Logger.log("Cline extension deactivated");
}

// TODO: Find a solution for automatically removing DEV related content from production builds.
// This type of code is fine in production to keep. We just will want to remove it from production builds
// to bring down built asset sizes.
//
// This is a workaround to reload the extension when the source code changes
// since vscode doesn't support hot reload for extensions
const IS_DEV = process.env.IS_DEV;
const DEV_WORKSPACE_FOLDER = process.env.DEV_WORKSPACE_FOLDER;

// Set up development mode file watcher
if (IS_DEV && IS_DEV !== "false") {
  assert(
    DEV_WORKSPACE_FOLDER,
    "DEV_WORKSPACE_FOLDER must be set in development"
  );
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(DEV_WORKSPACE_FOLDER, "src/**/*")
  );

  watcher.onDidChange(({ scheme, path }) => {
    console.info(`${scheme} ${path} changed. Reloading VSCode...`);

    vscode.commands.executeCommand("workbench.action.reloadWindow");
  });
}
