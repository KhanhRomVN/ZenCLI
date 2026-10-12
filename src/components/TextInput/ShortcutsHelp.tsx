/**
 * ------------------------------------------------------------------
 * ShortcutsHelp
 * ------------------------------------------------------------------
 * Bảng hiển thị phím tắt hỗ trợ người dùng trong giao diện dòng lệnh.
 * Được kích hoạt khi gõ "?" ở vị trí đầu tiên của ô nhập liệu.
 *
 * Main features:
 * - Liệt kê các tổ hợp phím nhanh (shell mode, commands, file paths...)
 * - Hiển thị mô tả ngắn gọn cho từng phím tắt
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ─
import React from 'react'

// ── UI ─
import { Box, Text } from 'ink'

// ─── Interfaces ────────────────────────────────────────────────────────
interface ShortcutEntry {
  key: string
  description: string
}

// ─── Constants ─────────────────────────────────────────────────────────
const SHORTCUTS: ShortcutEntry[] = [
  { key: '! for shell mode', description: 'double tap esc to clear input' },
  { key: '/ for commands', description: 'shift + tab to auto-accept edits' },
  { key: '@ for file paths', description: 'ctrl + o for verbose output' },
  { key: '/btw for side question', description: 'ctrl + t to toggle tasks' },
  { key: '', description: 'ctrl + shift + _ to undo' },
  { key: '', description: 'ctrl + v to paste images' },
  { key: '', description: 'alt + p to switch model' },
  { key: '', description: 'ctrl + s to stash prompt' },
  { key: '', description: 'backslash (\\) + return (⏎) for newline' },
]

// ─── Component ──────────────────────────────────────────────────────────
export function ShortcutsHelp(): React.JSX.Element {
  // ── Render ─
  return (
    <Box flexDirection="column" paddingX={1} marginTop={0}>
      {SHORTCUTS.map((entry, i) => (
        <Box key={i}>
          <Box width={30}>
            <Text color="cyan">{entry.key}</Text>
          </Box>
          <Text dimColor>{entry.description}</Text>
        </Box>
      ))}
    </Box>
  )
}