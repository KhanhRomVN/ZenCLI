/**
 * ------------------------------------------------------------------
 * useImeInput — IME-aware input hook for Ink terminal
 * ------------------------------------------------------------------
 * Handles Vietnamese/CJK IME composition in terminal environments
 * where Ink's useInput doesn't distinguish between composed and
 * committed characters.
 *
 * Strategy:
 * - Buffers keystrokes during composition (detected via timeout gap)
 * - Commits buffered text after COMPOSITION_TIMEOUT ms of silence
 * - Immediate submit on Enter bypasses the buffer
 * ------------------------------------------------------------------
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useInput } from "ink";

interface UseImeInputOptions {
  onSubmit: (value: string) => void;
  onChange?: (value: string) => void;
  onTabPress?: () => void;
}

interface UseImeInputResult {
  value: string;
  isComposing: boolean;
}

const COMPOSITION_TIMEOUT = 800; // ms — wait before committing IME buffer

export function useImeInput({
  onSubmit,
  onChange,
  onTabPress,
}: UseImeInputOptions): UseImeInputResult {
  const [value, setValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const commitValue = useCallback(
    (committed: string) => {
      if (!committed) return;
      setIsComposing(false);
      setValue("");
      onSubmit(committed);
    },
    [onSubmit],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  useInput((input, key) => {
    // Enter submits immediately
    if (key.return) {
      clearTimer();
      const toSubmit = value;
      setValue("");
      setIsComposing(false);
      onSubmit(toSubmit);
      return;
    }

    // Escape clears
    if (key.escape) {
      clearTimer();
      setValue("");
      setIsComposing(false);
      onChange?.("");
      return;
    }

    // Backspace removes last character
    if (key.backspace || key.delete) {
      clearTimer();
      const newValue = value.slice(0, -1);
      setValue(newValue);
      setIsComposing(false);
      onChange?.(newValue);
      return;
    }

    // Ctrl/meta combinations are ignored
    if (key.ctrl || key.meta) return;

    // Arrow keys are ignored
    if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)
      return;
    
    // Tab triggers prompt length cycling
    if (key.tab) {
      onTabPress?.();
      return;
    }

    // Regular printable character
    if (input) {
      const newValue = value + input;
      setValue(newValue);
      setIsComposing(true);
      onChange?.(newValue);

      // Reset composition timer
      clearTimer();
      timerRef.current = setTimeout(() => {
        setIsComposing(false);
      }, COMPOSITION_TIMEOUT);
    }
  });

  return { value, isComposing };
}