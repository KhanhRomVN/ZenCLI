import FormData from "form-data";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage.js";
import { logger } from "./logger.js";
import { Account } from "../types/index.js";
import { CLAUDE_BASE_URL as BASE_URL } from "../config/constants.js";

export class ApiClient {
  private account: Account;

  constructor(account: Account) {
    this.account = account;
  }

  private getHeaders(): Record<string, string> {
    return {
      accept: "application/json, text/event-stream",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      cookie:
        this.account.cookieString ||
        `sessionKey=${this.account.sessionKey}; lastActiveOrg=${this.account.orgId}`,
      origin: BASE_URL,
      referer: BASE_URL,
      "anthropic-client-platform": "web_claude_ai",
      "anthropic-client-version": "1.0.0",
      "anthropic-device-id": storage.getDeviceId(),
      "anthropic-anonymous-id": storage.getAnonymousId(),
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
  }

  async getConversations(): Promise<any[]> {
    logger.debug(
      "Fetching conversations",
      { orgId: this.account.orgId },
      "ApiClient"
    );

    const response = await fetch(
      `${BASE_URL}/api/organizations/${this.account.orgId}/chat_conversations`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      logger.error(
        "Failed to fetch conversations",
        {
          status: response.status,
          statusText: response.statusText,
        },
        "ApiClient"
      );
      throw new Error(`Failed to get conversations: ${response.statusText}`);
    }

    const conversations = await response.json();
    logger.debug(
      "Conversations fetched",
      { count: conversations.length },
      "ApiClient"
    );

    return conversations;
  }

  async getConversation(conversationId: string): Promise<any> {
    const response = await fetch(
      `${BASE_URL}/api/organizations/${this.account.orgId}/chat_conversations/${conversationId}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get conversation: ${response.statusText}`);
    }

    return await response.json();
  }

  async createConversation(
    model?: string
  ): Promise<{ conversationId: string; parentMessageUuid: string }> {
    const conversationId = uuidv4();
    const conversationName = `Chat ${new Date().toLocaleString("vi-VN")}`;

    logger.info(
      "Creating conversation",
      {
        conversationId,
        name: conversationName,
        model: model || "claude-sonnet-4-5-20250929",
      },
      "ApiClient"
    );

    const response = await fetch(
      `${BASE_URL}/api/organizations/${this.account.orgId}/chat_conversations`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          uuid: conversationId,
          name: conversationName,
          model: model || "claude-sonnet-4-5-20250929",
        }),
      }
    );

    if (!response.ok) {
      logger.error(
        "Failed to create conversation",
        {
          status: response.status,
          statusText: response.statusText,
        },
        "ApiClient"
      );
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }

    const data = await response.json();
    logger.info(
      "Conversation created successfully",
      {
        conversationId,
        responseUuid: data.uuid,
      },
      "ApiClient"
    );

    return {
      conversationId,
      parentMessageUuid: data.uuid || conversationId,
    };
  }

  
  async uploadFile(file: any): Promise<{ uuid: string; size: number }> {
    const formData = new FormData();
    // Convert base64 to buffer
    const base64Data = file.content.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    formData.append("file", buffer, {
      filename: file.name,
      contentType: file.type,
    });
    formData.append("orgUuid", this.account.orgId);

    const url = `${BASE_URL}/api/organizations/${this.account.orgId}/upload`;
    const headers = this.getHeaders();
    delete headers["content-type"]; // Let FormData set the boundary

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { uuid: data.uuid, size: data.size };
  }


async sendMessage(
    conversationId: string,
    parentMessageUuid: string,
    prompt: string,
    onData?: (chunk: string) => void,
    files?: any[]
  ): Promise<{
    messageUuid: string;
    inputTokens: number;
    outputTokens: number;
    content: string;
  }> {
    logger.info(
      "Sending message",
      {
        conversationId,
        promptLength: prompt.length,
        filesCount: files?.length || 0,
      },
      "ApiClient"
    );

    const url = `${BASE_URL}/api/organizations/${this.account.orgId}/chat_conversations/${conversationId}/completion`;

    const attachments = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          logger.info(`Uploading file: ${file.name}`, {}, "ApiClient");
          const { uuid, size } = await this.uploadFile(file);
          attachments.push({
            file_name: file.name,
            file_type: file.type,
            file_size: size,
            uuid: uuid,
          });
          logger.info(`Upload success: ${uuid}`, {}, "ApiClient");
        } catch (error: any) {
           logger.error(`Failed to upload file ${file.name}`, { error: error.message }, "ApiClient");
           // Continue or throw? Let's continue but maybe warn
        }
      }
    }

    const body = {
      prompt,
      parent_message_uuid:
        parentMessageUuid === conversationId ? null : parentMessageUuid,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      personalized_styles: [
        {
          type: "default",
          key: "Default",
          name: "Normal",
          nameKey: "normal_style_name",
          prompt: "Normal",
          summary: "Default responses from Claude",
          summaryKey: "normal_style_summary",
          isDefault: true,
        },
      ],
      locale: "en-US",
      tools: [
        { type: "web_search_v0", name: "web_search" },
        { type: "artifacts_v0", name: "artifacts" },
        { type: "repl_v0", name: "repl" },
      ],
      attachments: attachments,
      files: [],
      sync_sources: [],
      rendering_mode: "messages",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API] Error response:", errorText);
      throw new Error(
        `Failed to send message: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    let fullText = "";
    let messageUuid = "";
    let inputTokens = 0;
    let outputTokens = 0;

    // Stream response - node-fetch auto-decompresses gzip
    const stream = response.body;
    if (!stream) {
      console.error("[API] No response body");
      throw new Error("No response body");
    }

    let buffer = "";
    let chunkCount = 0;

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => {
        chunkCount++;
        const text = chunk.toString("utf8");
        buffer += text;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.substring(6).trim();
              if (jsonStr === "[DONE]") {
                resolve({
                  messageUuid,
                  inputTokens,
                  outputTokens,
                  content: fullText,
                });
                return;
              }

              const data = JSON.parse(jsonStr);

              // Handle different event types
              if (data.type === "message_start" && data.message) {
                messageUuid = data.message.uuid;
              }

              if (data.type === "content_block_delta" && data.delta?.text) {
                fullText += data.delta.text;
                if (onData) {
                  onData(fullText);
                }
              }

              // Track tokens
              if (data.usage) {
                inputTokens = data.usage.input_tokens || 0;
                outputTokens = data.usage.output_tokens || 0;
              }

              // Fallback for old format
              if (data.text) {
                fullText = data.text;
                if (onData) {
                  onData(fullText);
                }
              }

              if (data.messageUuid) {
                messageUuid = data.messageUuid;
              }
            } catch (error) {
              console.warn(
                "[API] Parse error:",
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        }
      });

      stream.on("end", () => {
        logger.info(
          "Message completed",
          {
            messageUuid,
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
          },
          "ApiClient"
        );
        resolve({ messageUuid, inputTokens, outputTokens, content: fullText });
      });

      stream.on("error", (error) => {
        logger.error("Stream error", { error: error.message }, "ApiClient");
        console.error("[API] Stream error:", error);
        reject(error);
      });
    });
  }

  async getAvailableModels(): Promise<any[]> {
    try {
      const response = await fetch(
        `${BASE_URL}/api/organizations/${this.account.orgId}/models`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get models");
      }

      return await response.json();
    } catch (error) {
      // Return default models if API fails
      return [
        { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
        { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
        { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
      ];
    }
  }
}

export function getApiClient(): ApiClient {
  const account = storage.getActiveAccount();
  if (!account) {
    throw new Error("No active account. Please login first.");
  }
  return new ApiClient(account);
}
