import React from "react";
import { Box, Text } from "ink";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolAction {
  type: string;
  params: Record<string, any>;
}

export interface ToolOutput {
  output: string;
  isError: boolean;
}

export interface ToolRendererProps {
  action: ToolAction;
  actionIndex: number;
  messageId: string;
  isActionClicked: boolean;
  toolOutputs?: Record<string, ToolOutput>;
}

// ============================================================================
// TOOL LABEL MAP
// ============================================================================

const TOOL_LABELS: Record<string, string> = {
  read_file: "Read",
  write_to_file: "Write",
  replace_in_file: "Replace",
  delete_file: "Delete",
  list_files: "List",
  find_files: "Find",
  grep: "Grep",
  run_command: "Run",
  revert_file: "Revert",
  view_replace_history: "History",
  git_status: "GitStatus",
  git_diff: "GitDiff",
  commit_message: "Commit",
  search_skill: "SearchSkill",
  list_skill: "ListSkill",
  read_skill: "ReadSkill",
  install_skill: "InstallSkill",
};

function getToolLabel(type: string): string {
  return TOOL_LABELS[type] || type;
}

// ============================================================================
// SUMMARY BUILDERS — one per tool type
// ============================================================================

function buildReadSummary(_params: Record<string, any>, output?: ToolOutput): string {
  // Always show the actual number of lines read once the tool has produced output.
  // Falls back to a neutral placeholder while the executor is still running.
  if (output && !output.isError && typeof output.output === "string" && output.output.length > 0) {
    const lineCount = output.output.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
    return `Read ${lineCount} lines`;
  }
  return "Reading file...";
}

function buildWriteSummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  const content = params.content || "";
  const lineCount = content ? content.split("\n").length : 0;
  return `Wrote ${lineCount} lines to ${filePath}`;
}

function buildReplaceSummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  return `Replace in ${filePath}`;
}

function buildDeleteSummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  return `Delete ${filePath}`;
}

function buildListFilesSummary(params: Record<string, any>, output?: ToolOutput): string {
  const folderPath = params.folder_path || params.path || ".";
  if (output && !output.isError && output.output) {
    const entryCount = output.output.split("\n").filter((l: string) => l.trim()).length;
    return `Listed ${entryCount} entries in ${folderPath}`;
  }
  return `List ${folderPath}`;
}

function buildFindFilesSummary(params: Record<string, any>, output?: ToolOutput): string {
  const fileName = params.file_name || params.pattern || "";
  const folderPath = params.folder_path || "";
  const scope = folderPath ? ` in ${folderPath}` : "";
  if (output && !output.isError && output.output) {
    const matchCount = output.output.split("\n").filter((l: string) => l.trim()).length;
    return `Found ${matchCount} files matching "${fileName}"${scope}`;
  }
  return `Find "${fileName}"${scope}`;
}

function buildGrepSummary(params: Record<string, any>, output?: ToolOutput): string {
  const searchTerm = params.search_term || params.searchTerm || "";
  const folderPath = params.folder_path || params.folderPath || "";
  const filePath = params.file_path || params.filePath || "";
  const scope = folderPath || filePath || "";
  if (output && !output.isError && output.output) {
    const matchLines = output.output.split("\n").filter((l: string) => l.trim());
    return `Found ${matchLines.length} matches for "${searchTerm}" in ${scope}`;
  }
  return `Grep "${searchTerm}" in ${scope}`;
}

function buildRunCommandSummary(params: Record<string, any>, output?: ToolOutput): string {
  const command = params.command || "";
  const truncated = command.length > 60 ? command.slice(0, 57) + "..." : command;
  if (output) {
    const status = output.isError ? "failed" : "done";
    return `Run "${truncated}" (${status})`;
  }
  return `Run "${truncated}"`;
}

function buildRevertSummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  const version = params.version ? ` to v${params.version}` : "";
  return `Revert ${filePath}${version}`;
}

function buildViewReplaceHistorySummary(params: Record<string, any>): string {
  const filePath = params.file_path || params.path || "";
  return `View replace history of ${filePath}`;
}

function buildGitStatusSummary(_params: Record<string, any>, output?: ToolOutput): string {
  if (output && !output.isError && output.output) {
    const changedFiles = output.output.split("\n").filter((l: string) => l.trim()).length;
    return `Git status: ${changedFiles} changed files`;
  }
  return "Git status";
}

function buildGitDiffSummary(_params: Record<string, any>): string {
  return "Git diff";
}

function buildCommitMessageSummary(_params: Record<string, any>): string {
  return "Generate commit message";
}

function buildSkillSummary(type: string, params: Record<string, any>): string {
  const slug = params.slug || params.search_term || params.searchTerm || "";
  const label = getToolLabel(type);
  return slug ? `${label} "${slug}"` : label;
}

// ============================================================================
// MAIN SUMMARY DISPATCHER
// ============================================================================

function buildSummary(action: ToolAction, output?: ToolOutput): string {
  const { type, params } = action;

  switch (type) {
    case "read_file":
      return buildReadSummary(params, output);
    case "write_to_file":
      return buildWriteSummary(params);
    case "replace_in_file":
      return buildReplaceSummary(params);
    case "delete_file":
      return buildDeleteSummary(params);
    case "list_files":
      return buildListFilesSummary(params, output);
    case "find_files":
      return buildFindFilesSummary(params, output);
    case "grep":
      return buildGrepSummary(params, output);
    case "run_command":
      return buildRunCommandSummary(params, output);
    case "revert_file":
      return buildRevertSummary(params);
    case "view_replace_history":
      return buildViewReplaceHistorySummary(params);
    case "git_status":
      return buildGitStatusSummary(params, output);
    case "git_diff":
      return buildGitDiffSummary(params);
    case "commit_message":
      return buildCommitMessageSummary(params);
    case "search_skill":
    case "list_skill":
    case "read_skill":
    case "install_skill":
      return buildSkillSummary(type, params);
    default:
      return `${getToolLabel(type)} ${JSON.stringify(params).slice(0, 80)}`;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Unified TUI renderer for all tool actions.
 *
 * Renders a consistent two-line format:
 *   ● ToolName(primary_param)
 *     ⎿  Summary description
 *
 * Markdown and Question blocks are NOT handled here — they have
 * their own dedicated TUI renderers.
 */
export function ToolRenderer({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  toolOutputs,
}: ToolRendererProps): React.JSX.Element {
  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId];
  const isError = output?.isError ?? false;

  const label = getToolLabel(action.type);
  const primaryParam =
    action.params.file_path ||
    action.params.folder_path ||
    action.params.file_name ||
    action.params.search_term ||
    action.params.searchTerm ||
    action.params.command ||
    action.params.slug ||
    "";

  const summary = buildSummary(action, output);

  // Color coding based on state.
  // The bullet stays semantic (green/red/yellow), but the tool label itself
  // is rendered in white per UI spec — keeping it readable regardless of status.
  const headerColor = isError ? "red" : isActionClicked ? "green" : "yellow";
  const detailColor = isError ? "red" : undefined;

  return (
    <Box flexDirection="column" marginBottom={0}>
      {/* Header line: ● ToolName(param) — label always white */}
      <Box>
        <Text color={headerColor}>{"● "}</Text>
        <Text bold color="white">
          {label}
        </Text>
        {primaryParam ? (
          <Text dimColor>({primaryParam})</Text>
        ) : null}
      </Box>

      {/* Detail line: ⎿ summary */}
      <Box paddingLeft={2}>
        <Text dimColor>{"⎿  "}</Text>
        <Text color={detailColor} dimColor={!isError}>
          {summary}
        </Text>
      </Box>
    </Box>
  );
}