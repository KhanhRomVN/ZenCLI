import { useState, useEffect, useRef, useCallback } from 'react'
import { useStdin } from 'ink'

interface UseImeInputOptions {
  onSubmit?: (value: string) => void
  onChange?: (value: string) => void
  placeholder?: string
}

interface UseImeInputResult {
  value: string
  setValue: (v: string) => void
  clear: () => void
  isComposing: boolean
}

/**
 * Custom text input hook with IME composition support for Vietnamese/CJK keyboards.
 *
 * Unlike @inkjs/ui TextInput which reads stdin in raw mode and only receives
 * final composed characters, this hook buffers intermediate keystrokes during
 * IME composition and only commits when the user presses Enter or Space after
 * a completed word. This prevents characters from "leaking" outside the input
 * when typing Vietnamese (Telex/VNI), Chinese (Pinyin), Japanese, or Korean.
 *
 * Heuristic: If multiple bytes arrive within a short window (< 80ms) without
 * an Enter/Escape, they are likely part of an IME composition sequence.
 * We buffer them and only flush on explicit submit or after a pause.
 */
export function useImeInput({
  onSubmit,
  onChange,
}: UseImeInputOptions = {}): UseImeInputResult {
  const [value, setValue] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const bufferRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { stdin, setRawMode } = useStdin()

  // Flush buffer: commit buffered text to value
  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length > 0) {
      const committed = bufferRef.current
      bufferRef.current = ''
      setIsComposing(false)
      setValue(prev => {
        const next = prev + committed
        onChange?.(next)
        return next
      })
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [onChange])

  useEffect(() => {
    if (!stdin) return

    setRawMode(true)

    const COMPOSE_TIMEOUT_MS = 80

    const handleData = (data: Buffer) => {
      const str = data.toString('utf-8')

      // Handle Enter (submit)
      if (str === '\r' || str === '\n') {
        flushBuffer()
        if (value.length > 0 || bufferRef.current.length > 0) {
          const finalValue = value + bufferRef.current
          bufferRef.current = ''
          setValue('')
          setIsComposing(false)
          onSubmit?.(finalValue)
        }
        return
      }

      // Handle Escape (cancel / clear)
      if (str === '\x1b') {
        bufferRef.current = ''
        setValue('')
        setIsComposing(false)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
        return
      }

      // Handle Backspace (\x7f or \b)
      if (str === '\x7f' || str === '\b') {
        if (bufferRef.current.length > 0) {
          // Remove last char from compose buffer
          bufferRef.current = bufferRef.current.slice(0, -1)
          if (bufferRef.current.length === 0) {
            setIsComposing(false)
          }
        } else {
          setValue(prev => {
            const next = prev.slice(0, -1)
            onChange?.(next)
            return next
          })
        }
        // Reset compose timer on backspace
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
        timerRef.current = setTimeout(flushBuffer, COMPOSE_TIMEOUT_MS)
        return
      }

      // Handle Ctrl+C
      if (str === '\x03') {
        process.exit(0)
        return
      }

      // Regular character input — buffer it for IME composition
      bufferRef.current += str
      setIsComposing(true)

      // Reset the compose timeout: if no more input arrives within
      // COMPOSE_TIMEOUT_MS, auto-flush the buffer (single ASCII char typed alone)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(flushBuffer, COMPOSE_TIMEOUT_MS)
    }

    stdin.on('data', handleData)

    return () => {
      stdin.removeListener('data', handleData)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [stdin, setRawMode, flushBuffer, onSubmit, onChange, value])

  const clear = useCallback(() => {
    bufferRef.current = ''
    setValue('')
    setIsComposing(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return { value, setValue, clear, isComposing }
}