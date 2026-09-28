/**
 * Core message types for ZenCLI chat.
 * Adapted from Zen — removed vscode/webview-specific fields.
 */

export type QuestionType = "single" | "multi" | "text" | "confirm";

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  options?: string[];
}

export interface QuestionAnswer {
  questionId: string;
  value: string | string[] | boolean;
}

/** Core message type representing a single chat turn. */
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  token_usage?: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** IDs of tool actions that generated this message. */
  actionIds?: string[];
  uiHidden?: boolean;
  isCancelled?: boolean;
  /** Real backend conversation ID for this message. */
  conversationId?: string;
  providerId?: string;
  modelId?: string;
  accountId?: string;
  websiteUrl?: string;
  email?: string;
  isError?: boolean;
  /** Legacy single option selection (kept for backward compatibility) */
  selectedOption?: string;
  /** Structured answers for new paginated question format */
  questionAnswers?: Record<string, QuestionAnswer>;
  thinking?: string;
  clickedActions?: string[];
  rejectedActions?: string[];
  /** DeepSeek parent_message_id for revert support. */
  response_message_id?: string;
  /** Qwen: fid (UUID) of the user message as sent to the provider. */
  providerFid?: string;
  /** Qwen: parent_message_id that was active when this user message was sent. */
  providerParentId?: string;
  /** Pre-parsed message content (cached for performance) */
  parsed?: any; // Will be typed as ParsedResponse once ResponseParser is ported
  /** Raw API request body (JSON string) sent to LLM provider. */
  rawRequest?: string;
  /** Raw API response content accumulated from SSE stream. */
  rawResponse?: string;
  /** Uploaded files sent with this message */
  uploadedFiles?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    content: string;
    file_id?: string;
  }>;
  /** Attached items (files/folders/snippets) sent with this message */
  attachedItems?: Array<{
    id: string;
    path: string;
    type: "file" | "external" | "text-snippet";
    content?: string;
    lineCount?: number;
  }>;
}