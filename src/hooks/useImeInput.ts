/**
 * ------------------------------------------------------------------
 * useImeInput Hook
 * ------------------------------------------------------------------
 * Xử lý nhập liệu tiếng Việt/CJK (IME Composition) trong môi trường Terminal.
 * Giải quyết vấn đề Ink.js không phân biệt được ký tự đang ghép (composing) và ký tự đã chốt (committed).
 *
 * Chiến lược:
 * - Buffer hóa các phím bấm trong quá trình ghép chữ
 * - Chốt nội dung sau khoảng im lặng nhất định (COMPOSITION_TIMEOUT)
 * - Cho phép Submit ngay lập tức khi nhấn Enter, bỏ qua buffer
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── React ──
import { useState, useCallback, useRef, useEffect } from "react";

// ── UI ──
import { useInput } from "ink";

// ─── Interfaces ───────────────────────────────────────────────────────
interface UseImeInputOptions {
  onSubmit: (value: string) => void;
  onChange?: (value: string) => void;
  onTabPress?: () => void;
  /** Called when Ctrl+C is pressed. Receives the current input value. */
  onCtrlC?: (currentValue: string) => void;
  /** Called when ESC is pressed. */
  onEsc?: () => void;
}

interface UseImeInputResult {
  value: string;
  isComposing: boolean;
  clearValue: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────
const COMPOSITION_TIMEOUT = 800; // ms — wait before committing IME buffer

// ─── Hook ───────────────────────────────────────────────────────────────
export function useImeInput({
  onSubmit,
  onChange,
  onTabPress,
  onCtrlC,
  onEsc,
}: UseImeInputOptions): UseImeInputResult {
  // ── State ──
  const [value, setValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  
  // ── Refs ──
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Callbacks ──
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

  // ── Effects ──
  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // ── Handlers ──
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

    // Escape: trigger onEsc callback (for exit countdown), but do NOT clear input here
    // The parent component decides whether to clear or start exit flow based on context
    if (key.escape) {
      clearTimer();
      onEsc?.();
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

    // Handle Ctrl+C explicitly before ignoring other ctrl/meta combos
    if (key.ctrl && input === 'c') {
      clearTimer();
      onCtrlC?.(value);
      return;
    }

    // Other Ctrl/meta combinations are ignored
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

  const clearValue = useCallback(() => {
    clearTimer();
    setValue("");
    setIsComposing(false);
    onChange?.("");
  }, [clearTimer, onChange]);

  return { value, isComposing, clearValue };
}