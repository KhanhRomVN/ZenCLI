import React, { useState, useEffect, useRef } from "react";
import { Text, Box, useStdout, useInput } from "ink";
import { getApiClient } from "../lib/api-client.js";
import { storage } from "../lib/storage.js";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  onExit: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onExit }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [parentMessageUuid, setParentMessageUuid] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const { stdout } = useStdout();
  const [terminalHeight, setTerminalHeight] = useState(24);

  const account = storage.getActiveAccount();
  const apiClient = getApiClient();

  useEffect(() => {
    // Get terminal dimensions
    const { rows } = stdout;
    setTerminalHeight(rows - 10); // Reserve space for input

    // Initialize conversation
    initializeConversation();

    // Cursor blink
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  const initializeConversation = async () => {
    setIsLoading(true);
    try {
      const { conversationId, parentMessageUuid } =
        await apiClient.createConversation(storage.getDefaultModel());
      setConversationId(conversationId);
      setParentMessageUuid(parentMessageUuid);

      // Add welcome message
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hello! I'm Claude. How can I help you today?`,
          timestamp: Date.now(),
        },
      ]);
    } catch (error: any) {
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
    setIsLoading(true);

    try {
      let assistantMessage = "";

      const { messageUuid } = await apiClient.sendMessage(
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

    // Handle Enter key
    if (key.return) {
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
      setInput((prev) => prev.slice(0, -1));
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
      return;
    }

    // Add regular character (including Vietnamese characters)
    if (inputChar) {
      setInput((prev) => prev + inputChar);
    }
  });

  // Calculate visible messages based on scroll
  const visibleMessages = messages.slice(
    Math.max(0, messages.length - terminalHeight + 5),
    messages.length
  );

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="green">
          💬 ZenCLI Chat
        </Text>
        <Text> • </Text>
        <Text color="cyan">{account?.name || "No Account"}</Text>
        <Text> • </Text>
        <Text color="yellow">{storage.getDefaultModel().split("-")[1]}</Text>
      </Box>

      {/* Messages Area */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
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
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="white">{"> "}</Text>
        <Text color="white">
          {input}
          {!isLoading && cursorVisible && <Text color="cyan">█</Text>}
        </Text>
      </Box>

      {/* Status Bar */}
      <Box>
        <Text color="gray">Messages: {messages.length}</Text>
        <Text color="gray"> • </Text>
        <Text color="gray">
          Enter Send • Ctrl+C Exit • Ctrl+L Clear • /help Commands
        </Text>
      </Box>
    </Box>
  );
};
