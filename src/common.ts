import * as vscode from "vscode";
import {
  cleanupMcpMarketplaceCatalogFromGlobalState,
  migrateCustomInstructionsToGlobalRules,
  migrateTaskHistoryToFile,
  migrateWelcomeViewCompleted,
  migrateWorkspaceToGlobalStorage,
} from "./core/storage/state-migrations";
import { Logger } from "./services/logging/Logger";
import "./utils/path"; // necessary to have access to String.prototype.toPosix

import { FileContextTracker } from "./core/context/context-tracking/FileContextTracker";
import { StateManager } from "./core/storage/StateManager";
import { ExtensionRegistryInfo } from "./registry";
import { audioRecordingService } from "./services/dictation/AudioRecordingService";
import { ErrorService } from "./services/error";
import { featureFlagsService } from "./services/feature-flags";
import { initializeDistinctId } from "./services/logging/distinctId";
import { telemetryService } from "./services/telemetry";
import { PostHogClientProvider } from "./services/telemetry/providers/posthog/PostHogClientProvider";

/**
 * Performs intialization for Cline that is common to all platforms.
 *
 * @param context
 * @returns The webview provider
 */
export async function initialize(
  context: vscode.ExtensionContext
): Promise<any> {
  try {
    await StateManager.initialize(context);
  } catch (error) {
    console.error(
      "[Controller] CRITICAL: Failed to initialize StateManager - extension may not function properly:",
      error
    );
  }

  // Set the distinct ID for logging and telemetry
  await initializeDistinctId(context);

  // Initialize PostHog client provider
  PostHogClientProvider.getInstance();

  // Setup the external services
  await ErrorService.initialize();
  await featureFlagsService.poll();

  // Migrate custom instructions to global Cline rules (one-time cleanup)
  await migrateCustomInstructionsToGlobalRules(context);

  // Migrate welcomeViewCompleted setting based on existing API keys (one-time cleanup)
  await migrateWelcomeViewCompleted(context);

  // Migrate workspace storage values back to global storage (reverting previous migration)
  await migrateWorkspaceToGlobalStorage(context);

  // Ensure taskHistory.json exists and migrate legacy state (runs once)
  await migrateTaskHistoryToFile(context);

  // Clean up MCP marketplace catalog from global state (moved to disk cache)
  await cleanupMcpMarketplaceCatalogFromGlobalState(context);

  // Clean up orphaned file context warnings (startup cleanup)
  await FileContextTracker.cleanupOrphanedWarnings(context);

  await showVersionUpdateAnnouncement(context);

  telemetryService.captureExtensionActivated();

  return null; // No webview in CLI mode
}

async function showVersionUpdateAnnouncement(context: vscode.ExtensionContext) {
  // Version checking for autoupdate notification
  const currentVersion = ExtensionRegistryInfo.version;
  const previousVersion = context.globalState.get<string>("clineVersion");
  // Perform post-update actions if necessary
  try {
    if (!previousVersion || currentVersion !== previousVersion) {
      Logger.log(
        `Cline version changed: ${previousVersion} -> ${currentVersion}. First run or update detected.`
      );

      // Always update the main version tracker for the next launch.
      await context.globalState.update("clineVersion", currentVersion);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error during post-update actions: ${errorMessage}, Stack trace: ${error.stack}`
    );
  }
}

/**
 * Performs cleanup when Cline is deactivated that is common to all platforms.
 */
export async function tearDown(): Promise<void> {
  // Clean up audio recording service to ensure no orphaned processes
  audioRecordingService.cleanup();

  PostHogClientProvider.getInstance().dispose();
  telemetryService.dispose();
  ErrorService.get().dispose();
  featureFlagsService.dispose();
  // No webview instances to dispose in CLI mode
}
