/**
 * ResponseParser — Parse AI response to extract tool actions and content blocks.
 * Adapted from Zen for ZenCLI:
 * - Import paths adjusted to src/ structure
 * - Removed window.localStorage debug flag (use env var instead)
 * - All parsers are pure Node.js, no DOM dependency
 */

import { parseToolAction } from "../utils/ToolParser";
import { getAllToolTypes } from "../constants/tag-registry";
import { findClosingTagPosition } from "../utils/TagClosingFinder";
import type { TagType } from "../types/tag-types";
import type { Question } from "../types/message";

// Tag parsers
import { parseReadFile } from "./tools/ReadFileParser";
import { parseWriteToFile } from "./tools/WriteToFileParser";
import { parseReplaceInFile } from "./tools/ReplaceInFileParser";
import { parseListFiles } from "./tools/ListFilesParser";
import { parseFindFiles } from "./tools/FindFilesParser";
import { parseGrep } from "./tools/GrepParser";
import { parseDeleteFile } from "./tools/DeleteFileParser";
import { parseRevertFile } from "./tools/RevertFileParser";
import { parseViewReplaceHistory } from "./tools/ViewReplaceHistoryParser";
import { parseRunCommand } from "./tools/RunCommandParser";
import { parseGitStatus } from "./tools/GitStatusParser";
import { parseGitDiff } from "./tools/GitDiffParser";
import { parseCommitMessage } from "./tools/CommitMessageParser";
import { parseMarkdown } from "./tools/MarkdownParser";
import { parseQuestion } from "./tools/QuestionParser";
import { parseConversationTitle } from "./tools/ConversationTitleParser";
import { parseSearchSkill } from "./tools/SearchSkillParser";
import { parseListSkill } from "./tools/ListSkillParser";
import { parseReadSkill } from "./tools/ReadSkillParser";
import { parseInstallSkill } from "./tools/InstallSkillParser";
import { parseThinking } from "./tools/ThinkingParser";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ToolAction {
  type: TagType;
  params: Record<string, any>;
  rawXml: string;
  isError?: boolean;
  errorMessage?: string;
  errorCode?: string;
}

export type ContentBlock =
  | { type: "markdown"; content: string }
  | { type: "code"; content: string; language: string }
  | {
      type: "question";
      options: string[];
      title?: string;
      optional?: boolean;
      questions?: Question[];
      selectedOption?: string;
      questionAnswers?: Record<string, any>;
    }
  | { type: "tool"; action: ToolAction; actionIndex?: number }
  | { type: "thinking"; content: string }
  | { type: "conversation_title"; content: string }
  | {
      type: "error";
      content: string;
      errorCode?: string;
      toolName?: string;
      toolParams?: Record<string, any>;
    };

export interface ParsedResponse {
  followupQuestion: string | null;
  followupOptions: string[] | null;
  taskName: string | null;
  actions: ToolAction[];
  contentBlocks: ContentBlock[];
  displayText: string;
  question: ContentBlock | null;
  onlyThinkingDetected?: boolean;
}

// ─── Debug flag via env var (replaces window.localStorage) ──────────────

const DEBUG_PARSER = process.env.ZEN_DEBUG_PARSER === "true";

// ─── Main parser ────────────────────────────────────────────────────────

export const parseAIResponse = (content: string): ParsedResponse => {
  const result: ParsedResponse = {
    followupQuestion: null,
    followupOptions: null,
    taskName: null,
    actions: [],
    contentBlocks: [],
    displayText: "",
    question: null,
  };

  let remainingContent = content;

  // Hide markers
  remainingContent = remainingContent.replace(/<\/no_response\s*>/gi, "");

  // Auto-generated tool patterns from registry

  // Auto-generated tool patterns from registry
  const toolPatterns = [
    ...getAllToolTypes().filter((t) => t !== "thinking"),
    "file",
    "markdown",
    "code",
    "question",
    "conversation_title",
  ];

  // Fix missing opening bracket for the first tool call
  const toolNamesPattern = toolPatterns.join("|");
  const missingBracketRegex = new RegExp(
    `^([ \t]*(?:•[ \t]*)?)(${toolNamesPattern})>`,
  );
  if (missingBracketRegex.test(remainingContent)) {
    remainingContent = remainingContent.replace(missingBracketRegex, "$1<$2>");
  }

  const findNextTag = (str: string) => {
    let minIndex = -1;
    let bestMatch: any = null;
    let bestTool = "";
    let isClosed = false;

    // 1. Try to find complete (closed) tags first
    for (const toolName of toolPatterns) {
      const openRegex = new RegExp(`<${toolName}(?:\\s+[^>]*)?>`, "i");
      const openMatch = openRegex.exec(str);

      if (!openMatch) continue;

      const openIndex = openMatch.index;
      const openTagFull = openMatch[0];
      const startContentPos = openIndex + openTagFull.length;

      // Self-closing tag
      if (openTagFull.trim().endsWith("/>")) {
        if (minIndex === -1 || openIndex < minIndex) {
          minIndex = openIndex;
          bestMatch = [openTagFull, ""];
          bestTool = toolName;
          isClosed = true;
        }
        continue;
      }

      // Find closing tag using backtick-aware search
      const closingTagPattern = `</${toolName}>`;
      let closingPos = findClosingTagPosition(
        str,
        startContentPos,
        closingTagPattern,
      );

      // Fallback: simple search
      if (closingPos === -1) {
        const simpleClosingIndex = str.indexOf(
          closingTagPattern,
          startContentPos,
        );
        if (simpleClosingIndex !== -1) {
          closingPos = simpleClosingIndex;
        }
      }

      if (closingPos !== -1) {
        if (minIndex === -1 || openIndex < minIndex) {
          const innerContent = str.substring(startContentPos, closingPos);
          const fullMatch = str.substring(
            openIndex,
            closingPos + closingTagPattern.length,
          );
          minIndex = openIndex;
          bestMatch = [fullMatch, innerContent];
          bestMatch.index = openIndex;
          bestTool = toolName;
          isClosed = true;
        }
      }
    }

    // 2. If no closed tag found, check for unclosed start tags
    if (minIndex === -1) {
      for (const toolName of toolPatterns) {
        const openRegex = new RegExp(`<${toolName}(?:\\s+[^>]*)?>`, "i");
        const match = openRegex.exec(str);
        if (match) {
          if (minIndex === -1 || match.index < minIndex) {
            minIndex = match.index;
            bestMatch = match;
            bestTool = toolName;
            isClosed = false;
          }
        }
      }
    }

    return { index: minIndex, match: bestMatch, toolName: bestTool, isClosed };
  };

  const pushTextOrCodeBlocks = (baseType: "markdown", textContent: string) => {
    const regex =
      /```(\w*)\n?([\s\S]*?)```|<code\s+language=["']?(\w+)["']?>\s*([\s\S]*?)<\/code>/gi;
    let lastIndex = 0;
    let match;
    const segments: any[] = [];

    while ((match = regex.exec(textContent)) !== null) {
      const textBefore = textContent.substring(lastIndex, match.index);
      if (textBefore.trim().length > 0) {
        segments.push({ type: baseType, content: textBefore });
      }

      const isFencedBlock = match[1] !== undefined && match[2] !== undefined;
      const language = isFencedBlock ? match[1] || "text" : match[3] || "text";
      let codeContent = isFencedBlock ? match[2].trimEnd() : match[4].trimEnd();

      if (isFencedBlock && match[0].match(/```\w+[^\n]/)) {
        codeContent = codeContent.trimStart();
      }

      if (
        language === "markdown" ||
        (language === "text" && !codeContent.includes("\n"))
      ) {
        segments.push({ type: baseType, content: codeContent });
      } else {
        segments.push({ type: "code", content: codeContent, language });
      }

      lastIndex = regex.lastIndex;
    }

    const textAfter = textContent.substring(lastIndex);
    if (textAfter.trim().length > 0) {
      segments.push({ type: baseType, content: textAfter });
    }

    // Filter tool result text patterns
    const filterToolResultText = (text: string): string => {
      const toolResultPattern =
        /\[[\w_]+(?:\s+for\s+'[^']*')?\]\s+Result:[\s\S]*?(?=\n\[[\w_]+(?:\s+for\s+'[^']*')?\]\s+Result:|$)/g;
      return text.replace(toolResultPattern, "").trim();
    };

    for (const segment of segments) {
      if (segment.content.trim().length > 0) {
        const filteredContent =
          segment.type === baseType
            ? filterToolResultText(segment.content)
            : segment.content;

        if (filteredContent.trim().length > 0) {
          result.contentBlocks.push({ ...segment, content: filteredContent });
        }
      }
    }
  };

  let scanStr = remainingContent;

  while (scanStr.length > 0) {
    const { index, match, toolName, isClosed } = findNextTag(scanStr);

    if (index !== -1 && match) {
      // 1. Everything before the tag is markdown
      const prefix = scanStr.substring(0, index);
      if (prefix.trim().length > 0) {
        pushTextOrCodeBlocks("markdown", prefix);
      }

      // 2. Handle the tag
      const rawXml = match[0];

      if (isClosed) {
        const innerContent = match[1];

        if (toolName === "markdown") {
          const raw = innerContent || "";
          const questionMatch =
            /<question(?:\s+[^>]*)?>([\s\S]*?)<\/question>/i.exec(raw);
          if (questionMatch) {
            const preText = raw.substring(0, questionMatch.index);
            const questionRaw = questionMatch[0];
            const postText = raw.substring(
              questionMatch.index + questionRaw.length,
            );

            if (preText.trim().length > 0) {
              pushTextOrCodeBlocks("markdown", parseMarkdown(preText));
            }

            const parsedQ = parseQuestion(questionMatch[1]);
            if (
              parsedQ.options.length > 0 ||
              (parsedQ.questions && parsedQ.questions.length > 0)
            ) {
              const qBlock: ContentBlock = {
                type: "question",
                options: parsedQ.options,
                title: parsedQ.title,
                optional: parsedQ.optional,
                ...(parsedQ.questions && parsedQ.questions.length > 0
                  ? { questions: parsedQ.questions }
                  : {}),
              };
              result.contentBlocks.push(qBlock);
              result.question = qBlock;
            }

            if (postText.trim().length > 0) {
              pushTextOrCodeBlocks("markdown", parseMarkdown(postText));
            }
          } else {
            const mdContent = parseMarkdown(raw);
            if (mdContent && mdContent.trim().length > 0) {
              pushTextOrCodeBlocks("markdown", mdContent);
            }
          }
        } else if (toolName === "question") {
          const parsedQ = parseQuestion(innerContent || "");
          const hasValidContent =
            parsedQ.options.length > 0 ||
            (parsedQ.questions && parsedQ.questions.length > 0);

          if (hasValidContent) {
            const qBlock: ContentBlock = {
              type: "question",
              options: parsedQ.options,
              title: parsedQ.title,
              optional: parsedQ.optional,
              ...(parsedQ.questions && parsedQ.questions.length > 0
                ? { questions: parsedQ.questions }
                : {}),
            };
            result.contentBlocks.push(qBlock);
            result.question = qBlock;

            if (parsedQ.options.length > 0) {
              result.followupOptions = parsedQ.options;
            }
          }
        } else if (toolName === "code") {
          const langMatch = /language=["']?(\w+)["']?/i.exec(rawXml);
          const language = langMatch ? langMatch[1] : "text";
          const codeContent = (innerContent || "").trim();

          if (codeContent.length > 0) {
            result.contentBlocks.push({
              type: "code",
              content: codeContent,
              language,
            });
          }
        } else if (toolName === "conversation_title") {
          const parsed = parseConversationTitle(innerContent || "");
          if (parsed.title && parsed.title.trim().length > 0) {
            result.contentBlocks.push({
              type: "conversation_title",
              content: parsed.title,
            });
          }
        } else {
          // It's a tool — delegate to individual tag parsers
          const actionIndex = result.actions.length;
          let action: ToolAction;

          switch (toolName) {
            case "read_file":
              action = {
                type: "read_file",
                params: parseReadFile(innerContent || ""),
                rawXml,
              };
              break;
            case "write_to_file":
              action = {
                type: "write_to_file",
                params: parseWriteToFile(innerContent || ""),
                rawXml,
              };
              break;
            case "replace_in_file":
              action = {
                type: "replace_in_file",
                params: parseReplaceInFile(innerContent || ""),
                rawXml,
              };
              break;
            case "list_files":
              action = {
                type: "list_files",
                params: parseListFiles(innerContent || ""),
                rawXml,
              };
              break;
            case "find_files":
              action = {
                type: "find_files",
                params: parseFindFiles(innerContent || ""),
                rawXml,
              };
              break;
            case "grep":
              action = {
                type: "grep",
                params: parseGrep(innerContent || ""),
                rawXml,
              };
              break;
            case "delete_file":
              action = {
                type: "delete_file",
                params: parseDeleteFile(innerContent || ""),
                rawXml,
              };
              break;
            case "revert_file":
              action = {
                type: "revert_file",
                params: parseRevertFile(innerContent || ""),
                rawXml,
              };
              break;
            case "view_replace_history":
              action = {
                type: "view_replace_history",
                params: parseViewReplaceHistory(innerContent || ""),
                rawXml,
              };
              break;
            case "run_command":
              action = {
                type: "run_command",
                params: parseRunCommand(innerContent || ""),
                rawXml,
              };
              break;
            case "git_status":
              action = {
                type: "git_status",
                params: parseGitStatus(innerContent || ""),
                rawXml,
              };
              break;
            case "git_diff":
              action = {
                type: "git_diff",
                params: parseGitDiff(innerContent || ""),
                rawXml,
              };
              break;
            case "commit_message":
              action = {
                type: "commit_message",
                params: parseCommitMessage(innerContent || ""),
                rawXml,
              };
              break;
            case "search_skill":
              action = {
                type: "search_skill",
                params: parseSearchSkill(innerContent || ""),
                rawXml,
              };
              break;
            case "list_skill":
              action = {
                type: "list_skill",
                params: parseListSkill(innerContent || ""),
                rawXml,
              };
              break;
            case "read_skill":
              action = {
                type: "read_skill",
                params: parseReadSkill(innerContent || ""),
                rawXml,
              };
              break;
            case "install_skill":
              action = {
                type: "install_skill",
                params: parseInstallSkill(innerContent || ""),
                rawXml,
              };
              break;
            default:
              action = parseToolAction(toolName, innerContent || "", rawXml);
          }

          result.contentBlocks.push({ type: "tool", action, actionIndex });
          result.actions.push(action);
        }

        // 3. Advance scanStr
        scanStr = scanStr.substring(index + rawXml.length);
      } else {
        // Unclosed tag — treat rest as markdown
        if (scanStr.trim()) {
          pushTextOrCodeBlocks("markdown", scanStr);
        }
        break;
      }
    } else {
      // No more tags — check for partial tag prefix at end
      const partialTagMatch = /<[\/]?[a-zA-Z0-9_]*$/.exec(scanStr);
      if (partialTagMatch) {
        const textBeforePartial = scanStr.substring(0, partialTagMatch.index);
        if (textBeforePartial.trim().length > 0) {
          pushTextOrCodeBlocks("markdown", textBeforePartial);
        }
      } else {
        if (scanStr.trim().length > 0) {
          pushTextOrCodeBlocks("markdown", scanStr);
        }
      }
      break;
    }
  }

  // Generate legacy displayText
  result.displayText = result.contentBlocks
    .filter((b: any) => b.type === "markdown")
    .map((b: any) => (b as any).content)
    .join("\n\n");

  return result;
};

/**
 * Format tool action for display
 */
export const formatActionForDisplay = (action: ToolAction): string => {
  switch (action.type) {
    case "read_file": {
      const range =
        action.params.start_line && action.params.end_line
          ? ` (${action.params.start_line}-${action.params.end_line})`
          : "";
      return `read_file: ${action.params.file_path || "unknown"}${range}`;
    }
    case "write_to_file":
      return `write_to_file: ${action.params.file_path || "unknown"}`;
    case "replace_in_file":
      return `replace_in_file: ${action.params.file_path || "unknown"}`;
    case "run_command":
      return `Run: ${action.params.command || ""}`;
    case "list_files":
      return `list_files: ${action.params.folder_path || "unknown"}`;
    case "find_files":
      return `find_files: ${action.params.file_name || ""}`;
    case "git_status":
      return `git_status`;
    case "search_skill":
      return `search_skill: ${action.params.search_term || ""}`;
    case "list_skill":
      return `list_skill`;
    case "read_skill":
      return `read_skill: ${action.params.slug || ""}`;
    case "install_skill":
      return `install_skill: ${action.params.slug || ""}`;
    default:
      return `${action.type}`;
  }
};
