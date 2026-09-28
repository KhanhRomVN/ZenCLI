import React, { useState, useCallback } from "react";
import { Box, Text } from "ink";
import { useImeInput } from "../../hooks/useImeInput";

interface TextInputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  onShortcutsToggle?: (visible: boolean) => void;
  onCommandToggle?: (visible: boolean) => void;
  /** When false, input shows red border and blocks submission */
  isConnected?: boolean;
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
}: TextInputProps): React.JSX.Element {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

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

  const { value, isComposing } = useImeInput({
    onSubmit: handleSubmitWithToggle,
    onChange: handleChange,
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
      <Text inverse> </Text>
    </Box>
  );
}
