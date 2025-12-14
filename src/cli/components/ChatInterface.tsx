import React, { useState, useEffect, useRef } from "react";
import { Text, Box, useStdout, useInput } from "ink";
import { getApiClient } from "../../core/lib/api-client.js";
import { storage } from "../../core/lib/storage.js";
import { logger } from "../../core/lib/logger.js";
import path from "path";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  onExit: () => void;
}

interface ConversationItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onExit }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [inputLines, setInputLines] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [parentMessageUuid, setParentMessageUuid] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);
  const { stdout } = useStdout();
  const [terminalHeight, setTerminalHeight] = useState(24);
  const [terminalWidth, setTerminalWidth] = useState(80);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [recentConversations, setRecentConversations] = useState<
    ConversationItem[]
  >([]);

  const commands = [
    { name: "/exit", description: "Exit the chat and return to main menu" },
    { name: "/quit", description: "Same as /exit" },
    { name: "/clear", description: "Clear conversation history" },
    { name: "/new", description: "Start a new conversation" },
    { name: "/help", description: "Show available commands" },
    { name: "/export", description: "Export conversation to file" },
    { name: "/context", description: "Show current context usage" },
    { name: "/cost", description: "Show token usage and estimated cost" },
  ];

  const account = storage.getActiveAccount();
  const apiClient = getApiClient();
  const currentFolder = process.cwd();

  useEffect(() => {
    // Get terminal dimensions
    const { rows, columns } = stdout;
    setTerminalHeight(rows - 2);
    setTerminalWidth(columns);

    // Initialize conversation
    initializeConversation();

    // Load recent conversations
    loadRecentConversations();

    // Cursor blink
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  const loadRecentConversations = async () => {
    try {
      logger.info("Loading recent conversations");
      const conversations = await apiClient.getConversations();
      logger.debug("Conversations loaded", { count: conversations.length });

      // Log toàn bộ object của conversation đầu tiên để xem cấu trúc
      if (conversations.length > 0) {
        logger.debug("Full conversation object sample", {
          fullObject: JSON.stringify(conversations[0], null, 2),
        });
      }

      const formatted = conversations
        .slice(0, 10)
        .map((conv: any, index: number) => {
          // Log chi tiết từng field
          logger.debug(`Conversation ${index} details`, {
            uuid: conv.uuid,
            name: conv.name,
            summary: conv.summary,
            chat_messages: conv.chat_messages ? conv.chat_messages.length : 0,
            updated_at: conv.updated_at,
            allKeys: Object.keys(conv),
          });

          // Trim name và check empty string
          const trimmedName = conv.name?.trim() || "";

          // Thử lấy tên từ chat_messages nếu có
          let displayName = trimmedName;
          if (
            !displayName &&
            conv.chat_messages &&
            conv.chat_messages.length > 0
          ) {
            const firstMessage = conv.chat_messages[0];
            if (firstMessage && firstMessage.text) {
              displayName = firstMessage.text.substring(0, 50) + "...";
            }
          }

          if (!displayName) {
            displayName = "Untitled";
          }

          return {
            id: conv.uuid,
            name: displayName,
            lastMessage: conv.summary || "",
            timestamp: new Date(conv.updated_at).getTime(),
          };
        });
      setRecentConversations(formatted);
    } catch (error: any) {
      logger.error("Failed to load conversations", { error: error.message });
    }
  };

  const initializeConversation = async () => {
    setIsLoading(true);
    try {
      logger.info("Creating new conversation", {
        model: storage.getDefaultModel(),
      });
      const { conversationId, parentMessageUuid } =
        await apiClient.createConversation(storage.getDefaultModel());
      setConversationId(conversationId);
      setParentMessageUuid(parentMessageUuid);
      logger.info("Conversation created successfully", { conversationId });
    } catch (error: any) {
      logger.error("Failed to create conversation", { error: error.message });
      setMessages([
        {
          id: "error",
          role: "assistant",
          content: `Error: ${error.message}`,
          timestamp: Date.now(),
        },
      ]);
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setInputLines([""]);
    setIsLoading(true);

    try {
      let assistantMessage = "";

      const {
        messageUuid,
        inputTokens: inTokens,
        outputTokens: outTokens,
      } = await apiClient.sendMessage(
        conversationId,
        parentMessageUuid,
        userInput,
        (chunk: string) => {
          assistantMessage = chunk;
          // Update the last message with streaming content
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              lastMsg.content = assistantMessage;
            }
            return newMessages;
          });
        }
      );

      setParentMessageUuid(messageUuid);
      setInputTokens((prev) => prev + inTokens);
      setOutputTokens((prev) => prev + outTokens);

      // Ensure assistant message is in state
      setMessages((prev) => {
        const hasAssistant = prev.some(
          (m) => m.role === "assistant" && m.id === "temp"
        );
        if (!hasAssistant) {
          return [
            ...prev,
            {
              id: "temp",
              role: "assistant",
              content: assistantMessage,
              timestamp: Date.now(),
            },
          ];
        }
        return prev;
      });
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "error",
          role: "assistant",
          content: `Error: ${error.message}`,
          timestamp: Date.now(),
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleCommand = (command: string) => {
    // Handle /help command
    if (command === "/help") {
      const helpText = commands
        .map((cmd) => `${cmd.name.padEnd(20)} ${cmd.description}`)
        .join("\n");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Available commands:\n\n${helpText}`,
          timestamp: Date.now(),
        },
      ]);
      setInput("");
      return true;
    }

    // Handle /export command
    if (command === "/export") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Export feature coming soon!",
          timestamp: Date.now(),
        },
      ]);
      setInput("");
      return true;
    }

    // Handle /context command
    if (command === "/context") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Current context: ${messages.length} messages`,
          timestamp: Date.now(),
        },
      ]);
      setInput("");
      return true;
    }

    // Handle /cost command
    if (command === "/cost") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Token usage:\nInput: ${inputTokens} tokens\nOutput: ${outputTokens} tokens\nTotal: ${inputTokens + outputTokens} tokens`,
          timestamp: Date.now(),
        },
      ]);
      setInput("");
      return true;
    }

    if (command === "/exit" || command === "/quit") {
      onExit();
      return true;
    }

    if (command === "/clear") {
      setMessages([]);
      setInput("");
      return true;
    }

    if (command === "/new") {
      initializeConversation();
      setInput("");
      return true;
    }

    if (command.startsWith("/")) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Unknown command: ${command}. Available: /exit, /quit, /clear, /new`,
          timestamp: Date.now(),
        },
      ]);
      setInput("");
      return true;
    }

    return false;
  };

  // Handle all keyboard input manually
  useInput((inputChar, key) => {
    if (isLoading) return;

    // Handle arrow keys when command suggestions are shown
    if (showCommandSuggestions) {
      if (key.upArrow) {
        setSelectedCommandIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        return;
      }

      if (key.downArrow) {
        setSelectedCommandIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (key.tab || key.return) {
        if (filteredCommands.length > 0) {
          const selectedCmd = filteredCommands[selectedCommandIndex];
          setInput(selectedCmd.name + " ");
          setShowCommandSuggestions(false);
          setSelectedCommandIndex(0);
        }
        return;
      }

      if (key.escape) {
        setShowCommandSuggestions(false);
        setSelectedCommandIndex(0);
        return;
      }
    }

    // Handle Enter key
    if (key.return) {
      // If Shift+Enter, add new line instead of sending
      if (key.shift) {
        const lines = input.split("\n");
        lines.push("");
        setInput(lines.join("\n"));
        setInputLines(lines);
        return;
      }

      if (!input.trim()) return;

      // Check if it's a command
      if (handleCommand(input.trim())) {
        return;
      }

      // Send message
      sendMessage();
      return;
    }

    // Handle Backspace
    if (key.backspace || key.delete) {
      setInput((prev) => {
        const newInput = prev.slice(0, -1);
        setInputLines(newInput.split("\n"));
        return newInput;
      });
      return;
    }

    // Handle Escape
    if (key.escape) {
      onExit();
      return;
    }

    // Handle Ctrl+C
    if (key.ctrl && inputChar === "c") {
      onExit();
      return;
    }

    // Handle Ctrl+L (clear screen)
    if (key.ctrl && inputChar === "l") {
      setMessages([]);
      setInput("");
      return;
    }

    // Handle Ctrl+U (clear input)
    if (key.ctrl && inputChar === "u") {
      setInput("");
      setInputLines([""]);
      return;
    }

    // Add regular character (including Vietnamese characters)
    if (inputChar) {
      const newInput = input + inputChar;
      setInput(newInput);
      setInputLines(newInput.split("\n"));

      // Show command suggestions when "/" is typed at start
      if (newInput.startsWith("/") && newInput.length > 0) {
        setShowCommandSuggestions(true);
        setSelectedCommandIndex(0);
      } else {
        setShowCommandSuggestions(false);
      }
    }
  });

  // Filter commands based on input
  const filteredCommands = input.startsWith("/")
    ? commands.filter((cmd) =>
        cmd.name.toLowerCase().includes(input.toLowerCase())
      )
    : [];

  // Calculate proper heights for each section
  const headerHeight = 14;
  const inputAreaHeight = Math.max(inputLines.length, 1) + 2; // +2 for border
  const statusBarHeight = 1;
  const commandPanelHeight =
    showCommandSuggestions && filteredCommands.length > 0
      ? Math.min(filteredCommands.length + 3, 10) // +3 cho header và footer, max 10 dòng
      : 0;
  const chatAreaHeight =
    terminalHeight -
    headerHeight -
    inputAreaHeight -
    statusBarHeight -
    commandPanelHeight -
    1; // Giảm thêm 1 dòng để spacing hợp lý
  const visibleMessages = messages.slice(
    Math.max(0, messages.length - chatAreaHeight),
    messages.length
  );

  // Shorten folder path
  const shortenPath = (fullPath: string) => {
    const parts = fullPath.split(path.sep);
    if (parts.length > 4) {
      return path.join("...", ...parts.slice(-3));
    }
    return fullPath;
  };

  // Left panel có fixed width để fit với logo và thông tin
  const leftColumnWidth = 62;
  const rightColumnWidth = Math.max(terminalWidth - leftColumnWidth - 3, 30);

  return (
    <Box flexDirection="column">
      {/* Header with 2 columns */}
      <Box borderStyle="round" borderColor="cyan" height={12}>
        {/* Left column */}
        <Box flexDirection="column" width={leftColumnWidth} paddingX={1}>
          <Text color="cyan">
            {"          ____                ___   _      ___"}
          </Text>
          <Text color="cyan">
            {"         |_  /  ___   _ _    / __| | |    |_ _|"}
          </Text>
          <Text color="cyan">
            {"          / /  / -_) | ' \\  | (__  | |__   | |"}
          </Text>
          <Text color="cyan">
            {"         /___| \\___| |_||_|  \\___| |____| |___|"}
          </Text>
          <Text color="cyan"> </Text>
          <Text color="green" bold>
            {"            Welcome back " + (account?.name || "User") + "!"}
          </Text>
          <Text> </Text>
          <Text color="yellow">
            Model: <Text color="white">{storage.getDefaultModel()}</Text>
          </Text>
          <Text color="yellow">
            Email: <Text color="white">{account?.email || "N/A"}</Text>
          </Text>
          <Text color="yellow">
            Folder: <Text color="white">{shortenPath(currentFolder)}</Text>
          </Text>
          <Text color="yellow">
            Input tokens: <Text color="white">{inputTokens}</Text> | Output
            tokens: <Text color="white">{outputTokens}</Text>
          </Text>
        </Box>

        {/* Divider */}
        <Box flexDirection="column" width={1}>
          <Text color="gray">│</Text>
          <Text color="gray">│</Text>
          <Text color="gray">│</Text>
          <Text color="gray">│</Text>
          <Text color="gray">│</Text>
          <Text color="gray">│</Text>
          <Text color="gray">│</Text>
          <Text color="gray">│</Text>
          <Text color="gray">│</Text>
          <Text color="gray">│</Text>
        </Box>

        {/* Right column */}
        <Box flexDirection="column" width={rightColumnWidth} paddingX={1}>
          <Text color="magenta" bold>
            Recent conversations
          </Text>
          <Text> </Text>
          {recentConversations.length > 0 ? (
            recentConversations.slice(0, 8).map((conv) => (
              <Box key={conv.id}>
                <Text color="cyan">{conv.name}</Text>
              </Box>
            ))
          ) : (
            <Text color="gray">No recent conversations</Text>
          )}
        </Box>
      </Box>

      {/* Messages Area */}
      <Box
        flexDirection="column"
        height={chatAreaHeight}
        overflow="hidden"
        paddingX={1}
      >
        {visibleMessages.map((msg) => (
          <Box key={msg.id} marginBottom={1}>
            <Box width={12}>
              <Text color={msg.role === "user" ? "blue" : "green"} bold>
                {msg.role === "user" ? "You:" : "Claude:"}
              </Text>
            </Box>
            <Box flexGrow={1}>
              <Text wrap="wrap">{msg.content}</Text>
            </Box>
          </Box>
        ))}

        {isLoading && (
          <Box>
            <Text color="yellow">Claude is thinking...</Text>
          </Box>
        )}
      </Box>

      {/* Input Area */}
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        flexDirection="column"
        height={inputAreaHeight}
      >
        {inputLines.map((line, index) => (
          <Box key={index}>
            {index === 0 && <Text color="white">{"> "}</Text>}
            {index > 0 && <Text color="white">{"  "}</Text>}
            <Text color="white">
              {line}
              {!isLoading &&
                cursorVisible &&
                index === inputLines.length - 1 && <Text color="cyan">█</Text>}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Status Bar or Command Panel */}
      {showCommandSuggestions && filteredCommands.length > 0 ? (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
        >
          <Text color="yellow" bold>
            Available Commands:
          </Text>
          {filteredCommands.slice(0, 5).map((cmd, index) => (
            <Box key={cmd.name}>
              <Text color={index === selectedCommandIndex ? "green" : "white"}>
                {index === selectedCommandIndex ? "→ " : "  "}
                {cmd.name.padEnd(20)}
              </Text>
              <Text color="gray">{cmd.description}</Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              ↑↓ Navigate • Tab/Enter Select • Double ESC Cancel
            </Text>
          </Box>
        </Box>
      ) : (
        <Box height={statusBarHeight}>
          <Text color="gray">? for help | / for commands</Text>
          <Text color="gray"> • </Text>
          <Text color="gray">⧉ In {path.basename(currentFolder)}</Text>
        </Box>
      )}
    </Box>
  );
};
