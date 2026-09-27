import React, { useState, useCallback } from 'react'
import { Box, Text } from 'ink'
import { useImeInput } from '../hooks/useImeInput.js'

interface TextInputProps {
  onSubmit: (value: string) => void
  placeholder?: string
  onShortcutsToggle?: (visible: boolean) => void
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
 * Typing "?" again at position 0 hides it. If any character precedes "?",
 * it is treated as normal input (no toggle).
 */
export function TextInput({ onSubmit, placeholder, onShortcutsToggle }: TextInputProps): React.JSX.Element {
  const [showShortcuts, setShowShortcuts] = useState(false)

  const setShortcutsVisible = useCallback((visible: boolean) => {
    setShowShortcuts(visible)
    onShortcutsToggle?.(visible)
  }, [onShortcutsToggle])

  const handleChange = useCallback((newValue: string) => {
    // Block "?" from ever appearing in the input value
    const cleaned = newValue.replace(/\?/g, '')

    // Toggle shortcuts only when "?" was typed as the first keystroke on empty input
    if (newValue === '?' || (newValue.length === 1 && newValue[0] === '?')) {
      setShortcutsVisible(!showShortcuts)
      return
    }

    if (cleaned !== newValue) {
      // "?" was embedded in longer text — strip it, don't toggle
      // The hook already set value to newValue; we rely on displayText filtering below
    }

    if (showShortcuts && cleaned.length > 0) {
      // User started typing real content — hide shortcuts
      setShortcutsVisible(false)
    }
  }, [showShortcuts, setShortcutsVisible])

  const handleSubmitWithToggle = useCallback((value: string) => {
    // Never submit a bare "?"
    if (value === '?') {
      setShortcutsVisible(!showShortcuts)
      return
    }
    setShortcutsVisible(false)
    onSubmit(value)
  }, [onSubmit, showShortcuts, setShortcutsVisible])

  const { value, isComposing } = useImeInput({
    onSubmit: handleSubmitWithToggle,
    onChange: handleChange,
  })

  // Strip any "?" from display — it should never render as a character
  const displayText = (value || '').replace(/\?/g, '') || (isComposing ? '' : '')
  const showPlaceholder = !displayText && !isComposing && placeholder && !showShortcuts

  return (
    <Box paddingX={0}>
      <Text color="cyan">{'❯ '}</Text>
      {showPlaceholder ? (
        <Text dimColor>{placeholder}</Text>
      ) : (
        <Text>{displayText}</Text>
      )}
      {/* Cursor indicator */}
      <Text inverse>{' '}</Text>
    </Box>
  )
}