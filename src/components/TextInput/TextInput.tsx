import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useApp } from "ink";
import { useImeInput } from "../../hooks/useImeInput";

interface TextInputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  onShortcutsToggle?: (visible: boolean) => void;
  onCommandToggle?: (visible: boolean) => void;
  /** When false, input shows red border and blocks submission */
  isConnected?: boolean;
  /** Callback to toggle thinking mode when Tab is pressed */
  onToggleThinking?: () => void;
  /** Callback to notify parent about exit countdown state changes */
  onExitStateChange?: (countdown: number | null) => void;
}

/**
 * Custom text input with IME composition support for Vietnamese/CJK keyboards.
 *
 * Replaces @inkjs/ui TextInput which doesn't handle IME composition events,
 * causing characters to leak outside the input when typing Vietnamese (Telex/VNI).
 * Uses useImeInput hook that buffers keystrokes during composition and only
 * commits after a timeout or explicit submit.
 *
 * Typing "?" as the very first character toggles the shortcuts help panel.
 * Typing "/" as the very first character toggles the command list panel.
 * Typing "?" or "/" again at position 0 hides the respective panel.
 */
export function TextInput({
  onSubmit,
  placeholder,
  onShortcutsToggle,
  onCommandToggle,
  isConnected = true,
  onToggleThinking,
  onExitStateChange,
}: TextInputProps): React.JSX.Element {
  const { exit } = useApp();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [exitCountdown, setExitCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync countdown state to parent
  useEffect(() => {
    onExitStateChange?.(exitCountdown);
  }, [exitCountdown, onExitStateChange]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const performExit = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setExitCountdown(null);
    exit(); // Use Ink's clean exit method
  }, [exit]);

  const startExitCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    let secondsLeft = 3;
    setExitCountdown(secondsLeft);
    
    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        // Timeout reached without second press: Cancel countdown, do NOT exit
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setExitCountdown(null);
      } else {
        setExitCountdown(secondsLeft);
      }
    }, 1000);
  }, []);

  const setShortcutsVisible = useCallback(
    (visible: boolean) => {
      setShowShortcuts(visible);
      onShortcutsToggle?.(visible);
    },
    [onShortcutsToggle],
  );

  const setCommandsVisible = useCallback(
    (visible: boolean) => {
      setShowCommands(visible);
      onCommandToggle?.(visible);
    },
    [onCommandToggle],
  );

  const handleChange = useCallback(
    (newValue: string) => {
      // Toggle shortcuts only when "?" is the sole character (typed on empty input)
      if (newValue === "?") {
        setShortcutsVisible(!showShortcuts);
        setCommandsVisible(false);
        return;
      }

      // Toggle commands only when "/" is the sole character (typed on empty input)
      if (newValue === "/") {
        setCommandsVisible(!showCommands);
        setShortcutsVisible(false);
        return;
      }

      // Any other input hides panels
      if (showShortcuts || showCommands) {
        setShortcutsVisible(false);
        setCommandsVisible(false);
      }
    },
    [showShortcuts, showCommands, setShortcutsVisible, setCommandsVisible],
  );

  const handleSubmitWithToggle = useCallback(
    (value: string) => {
      // Block submission when backend is unreachable
      if (!isConnected) return;

      // Never submit a bare "?" or "/"
      if (value === "?") {
        setShortcutsVisible(!showShortcuts);
        setCommandsVisible(false);
        return;
      }
      if (value === "/") {
        setCommandsVisible(!showCommands);
        setShortcutsVisible(false);
        return;
      }
      setShortcutsVisible(false);
      setCommandsVisible(false);
      onSubmit(value);
    },
    [
      onSubmit,
      isConnected,
      showShortcuts,
      showCommands,
      setShortcutsVisible,
      setCommandsVisible,
    ],
  );

  const { value, isComposing, clearValue } = useImeInput({
    onSubmit: handleSubmitWithToggle,
    onChange: handleChange,
    onTabPress: onToggleThinking,
    onCtrlC: (currentValue) => {
      if (currentValue.length > 0) {
        // Clear input if there's text
        clearValue();
        // Cancel any ongoing exit countdown if present
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          setExitCountdown(null);
        }
      } else {
        // Empty input
        if (exitCountdown !== null) {
          // Already counting down -> Exit immediately on second press
          performExit();
        } else {
          // Not counting down -> Start countdown
          startExitCountdown();
        }
      }
    },
    onEsc: () => {
      // ESC behavior:
      // 1. If there is text in input -> Clear it (same as Ctrl+C with text)
      // 2. If input is empty -> Start/Continue exit countdown (same as Ctrl+C on empty)
      if (value.length > 0) {
        clearValue();
        // Cancel any ongoing exit countdown if present
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          setExitCountdown(null);
        }
      } else {
        // Empty input
        if (exitCountdown !== null) {
          // Already counting down -> Exit immediately on second press
          performExit();
        } else {
          // Not counting down -> Start countdown
          startExitCountdown();
        }
      }
    },
  });

  // Display value as-is — "?" and "/" are only stripped when they are the sole character (toggle triggers)
  const displayText = value || (isComposing ? "" : "");
  const effectivePlaceholder = !isConnected
    ? "Connecting to backend..."
    : placeholder;
  const showPlaceholder =
    !displayText &&
    !isComposing &&
    effectivePlaceholder &&
    !showShortcuts &&
    !showCommands;

  const promptColor = isConnected ? "cyan" : "red";

  return (
    <Box paddingX={0}>
      <Text color={promptColor}>{isConnected ? "❯ " : "> "}</Text>
      {showPlaceholder ? (
        <Text color={!isConnected ? "red" : undefined} dimColor={isConnected}>{effectivePlaceholder}</Text>
      ) : (
        <Text>{displayText}</Text>
      )}
      {/* Cursor indicator */}
      <Text color="cyan">▌</Text>
    </Box>
  );
}
