import { buildPromptForMode } from "./prompt-modes.js";
import type { SystemPromptMode, PromptModeConfig } from "./prompt-modes.js";

export { buildIdentityPrompt } from "./identity.js";
export { buildWorkflow } from "./workflow.js";
export { TOOLS_REFERENCE } from "./tools-reference.js";
export { buildSystemContext } from "./system-context.js";
export type { SystemInfo } from "./system-context.js";
export { buildConstraints } from "./constraints.js";
export { TOOL_VALIDATION } from "./tool-validation.js";
// EXAMPLE used to be a plain constant; it is now mode-aware (see example.ts)
// so it is exported as a builder function instead.
export { buildExample } from "./example.js";
export { buildPromptForMode } from "./prompt-modes.js";
export type {
  SystemPromptMode,
  PromptModeConfig,
  PromptLengthMode,
} from "./prompt-modes.js";
export { MODE_BEHAVIORS } from "./mode-config.js";
export type { ModeBehaviorConfig } from "./mode-config.js";

interface PromptConfig {
  language: string;
  systemInfo: import("./system-context.js").SystemInfo;
}

/**
 * Build system prompt cho mode balanced (mặc định).
 */
export const combinePrompts = (config: PromptConfig): string => {
  return buildPromptForMode(config, "balanced");
};

/**
 * Build system prompt theo mode.
 */
export const combinePromptsForMode = (
  config: PromptModeConfig,
  mode: SystemPromptMode,
): string => {
  return buildPromptForMode(config, mode);
};
