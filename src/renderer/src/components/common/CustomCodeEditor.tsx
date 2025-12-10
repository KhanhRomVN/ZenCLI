import React, { useEffect, useRef, useState } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { php } from '@codemirror/lang-php'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import { markdown } from '@codemirror/lang-markdown'
import { sql } from '@codemirror/lang-sql'
import { cn } from '../../shared/lib/utils'
import { Wand2, Maximize2, Minimize2 } from 'lucide-react'

interface CustomCodeEditorProps {
  value: string
  language: string
  onChange: (value: string) => void
  onLanguageChange: (language: string) => void
  disabled?: boolean
  height?: number | 'auto' // New prop for height control
  maxHeight?: number // New prop for max height when auto
  minHeight?: number // New prop for min height
  autoDetectLanguage?: boolean // New prop for auto language detection
  showLanguageSelector?: boolean // Control language selector visibility
}

const CustomCodeEditor: React.FC<CustomCodeEditorProps> = ({
  value,
  language,
  onChange,
  onLanguageChange,
  disabled,
  height = 400,
  maxHeight = 600,
  minHeight = 200,
  autoDetectLanguage = true,
  showLanguageSelector = true
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState<string>('')

  // Available languages for CodeMirror
  const languages = [
    {
      value: 'javascript',
      label: 'JavaScript',
      keywords: ['function', 'const', 'let', 'var', '=>', 'require', 'import', 'export']
    },
    {
      value: 'typescript',
      label: 'TypeScript',
      keywords: ['interface', 'type', 'extends', 'implements', ':']
    },
    {
      value: 'python',
      label: 'Python',
      keywords: ['def', 'class', 'import', 'from', 'if __name__', 'print', 'lambda']
    },
    {
      value: 'java',
      label: 'Java',
      keywords: ['public class', 'private', 'public', 'void', 'String', 'System.out']
    },
    {
      value: 'csharp',
      label: 'C#',
      keywords: ['public class', 'namespace', 'using System', 'Console.WriteLine']
    },
    {
      value: 'cpp',
      label: 'C++',
      keywords: ['#include', 'std::', 'cout', 'cin', 'endl', 'namespace std']
    },
    { value: 'c', label: 'C', keywords: ['#include', 'printf', 'scanf', 'main()', 'stdio.h'] },
    { value: 'php', label: 'PHP', keywords: ['<?php', 'echo', '$', 'function', 'class', '->'] },
    { value: 'ruby', label: 'Ruby', keywords: ['def', 'class', 'end', 'puts', 'require'] },
    { value: 'go', label: 'Go', keywords: ['package', 'func', 'import', 'fmt.Println', 'var'] },
    { value: 'rust', label: 'Rust', keywords: ['fn', 'let', 'mut', 'println!', 'use', 'struct'] },
    {
      value: 'swift',
      label: 'Swift',
      keywords: ['func', 'var', 'let', 'class', 'import', 'print']
    },
    { value: 'kotlin', label: 'Kotlin', keywords: ['fun', 'val', 'var', 'class', 'println'] },
    { value: 'dart', label: 'Dart', keywords: ['void main', 'print', 'class', 'var', 'final'] },
    {
      value: 'html',
      label: 'HTML',
      keywords: ['<!DOCTYPE', '<html', '<head', '<body', '<div', '<script']
    },
    { value: 'css', label: 'CSS', keywords: ['{', '}', ':', ';', '@media', 'px', 'rem', 'em'] },
    { value: 'scss', label: 'SCSS', keywords: ['$', '@import', '@mixin', '@include', '&'] },
    { value: 'json', label: 'JSON', keywords: ['{', '}', '[', ']', '":', ','] },
    { value: 'xml', label: 'XML', keywords: ['<?xml', '</', '<', '>', 'xmlns'] },
    { value: 'yaml', label: 'YAML', keywords: ['---', ':', '-', '|', '>'] },
    {
      value: 'markdown',
      label: 'Markdown',
      keywords: ['#', '##', '###', '*', '**', '```', '[', ']']
    },
    {
      value: 'sql',
      label: 'SQL',
      keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE']
    },
    {
      value: 'shell',
      label: 'Shell',
      keywords: ['#!/bin/bash', 'echo', 'cd', 'ls', 'grep', 'awk']
    },
    {
      value: 'powershell',
      label: 'PowerShell',
      keywords: ['Write-Host', 'Get-', 'Set-', '$', 'param']
    },
    { value: 'plaintext', label: 'Plain Text', keywords: [] }
  ]

  // Auto-detect language based on content
  const detectLanguage = (content: string): string => {
    if (!content.trim()) return 'plaintext'

    const contentLower = content.toLowerCase()
    const scores: Record<string, number> = {}

    // Score each language based on keyword matches
    languages.forEach((lang) => {
      let score = 0
      lang.keywords.forEach((keyword) => {
        const keywordLower = keyword.toLowerCase()
        const matches = (
          contentLower.match(
            new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          ) || []
        ).length
        score += matches
      })

      if (score > 0) {
        scores[lang.value] = score
      }
    })

    // Return the language with highest score, or plaintext if no matches
    const bestMatch = Object.entries(scores).reduce(
      (a, b) => (scores[a[0]] > scores[b[0]] ? a : b),
      ['plaintext', 0]
    )
    return bestMatch[1] > 0 ? bestMatch[0] : 'plaintext'
  }

  // Auto-detect language when content changes
  useEffect(() => {
    if (autoDetectLanguage && value.trim() && !disabled) {
      const detected = detectLanguage(value)
      setDetectedLanguage(detected)

      // Only auto-change if current language is plaintext or if confidence is high
      if (language === 'plaintext' || language === '' || detected !== 'plaintext') {
        if (detected !== language) {
          onLanguageChange(detected)
        }
      }
    }
  }, [value, autoDetectLanguage, language, onLanguageChange, disabled])

  // Calculate dynamic height
  const calculateHeight = () => {
    if (height === 'auto') {
      const lines = value ? value.split('\n').length : 1
      const lineHeight = 24 // 24px per line
      const padding = 32 // 16px top + 16px bottom
      const calculatedHeight = Math.min(
        maxHeight,
        Math.max(minHeight, lines * lineHeight + padding)
      )
      return calculatedHeight
    }
    return isExpanded ? maxHeight : typeof height === 'number' ? height : 400
  }

  const dynamicHeight = calculateHeight()

  // Get language extension for CodeMirror
  const getLanguageExtension = (lang: string) => {
    switch (lang) {
      case 'javascript':
      case 'typescript':
        return javascript({ typescript: lang === 'typescript' })
      case 'python':
        return python()
      case 'java':
        return java()
      case 'cpp':
      case 'c':
        return cpp()
      case 'php':
        return php()
      case 'rust':
        return rust()
      case 'go':
        return go()
      case 'html':
        return html()
      case 'css':
      case 'scss':
        return css()
      case 'json':
        return json()
      case 'xml':
        return xml()
      case 'yaml':
        return yaml()
      case 'markdown':
        return markdown()
      case 'sql':
        return sql()
      default:
        return []
    }
  }

  // Custom save command
  const saveCommand = () => {
    return true
  }

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorRef.current) return

    const extensions = [
      basicSetup,
      oneDark,
      getLanguageExtension(language),
      keymap.of([
        indentWithTab,
        {
          key: 'Ctrl-s',
          mac: 'Cmd-s',
          run: saveCommand
        }
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !disabled) {
          const newValue = update.state.doc.toString()
          onChange(newValue)
        }
      }),
      EditorView.theme({
        '&': {
          fontSize: '14px',
          fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
          height: `${dynamicHeight}px`
        },
        '.cm-content': {
          padding: '16px',
          minHeight: `${dynamicHeight - 32}px`,
          maxHeight: `${dynamicHeight - 32}px`,
          lineHeight: '24px',
          overflow: 'auto'
        },
        '.cm-editor': {
          borderRadius: '0.5rem',
          height: `${dynamicHeight}px`
        },
        '.cm-focused': {
          outline: 'none'
        },
        '.cm-scroller': {
          fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
          maxHeight: `${dynamicHeight - 32}px`
        }
      }),
      EditorState.readOnly.of(disabled || false)
    ]

    const state = EditorState.create({
      doc: value,
      extensions
    })

    const view = new EditorView({
      state,
      parent: editorRef.current
    })

    viewRef.current = view
    setIsEditorReady(true)

    return () => {
      view.destroy()
      viewRef.current = null
      setIsEditorReady(false)
    }
  }, [language, disabled, dynamicHeight])

  // Update editor value when prop changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value
        }
      })
      viewRef.current.dispatch(transaction)
    }
  }, [value])

  // Calculate code statistics
  const lines = value ? value.split('\n') : ['']
  const lineCount = lines.length
  const characterCount = value ? value.length : 0
  const wordCount = value
    ? value
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length
    : 0

  // Auto-detect language button
  const handleAutoDetect = () => {
    if (value.trim()) {
      const detected = detectLanguage(value)
      onLanguageChange(detected)
      setDetectedLanguage(detected)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Programming Language
          </label>

          {/* Auto-detect button */}
          {autoDetectLanguage && !disabled && (
            <button
              onClick={handleAutoDetect}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md',
                'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40',
                'text-blue-700 dark:text-blue-300',
                'border border-blue-200 dark:border-blue-800',
                'transition-colors',
                !value.trim() && 'opacity-50 cursor-not-allowed'
              )}
              disabled={!value.trim()}
              title="Auto-detect language from code content"
            >
              <Wand2 className="h-3 w-3" />
              Auto-detect
            </button>
          )}

          {/* Detected language indicator */}
          {detectedLanguage && detectedLanguage !== language && autoDetectLanguage && (
            <span className="text-xs text-orange-600 dark:text-orange-400">
              Detected: {languages.find((l) => l.value === detectedLanguage)?.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Height toggle button */}
          {height !== 'auto' && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                'dark:hover:bg-gray-700 transition-colors'
              )}
              title={isExpanded ? 'Minimize editor' : 'Maximize editor'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}

          {/* Language selector */}
          {showLanguageSelector && (
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              disabled={disabled}
              className={cn(
                'px-3 py-1.5 text-sm border rounded-md outline-none transition-colors',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-700',
                'text-gray-900 dark:text-gray-100',
                'focus:border-blue-500 dark:focus:border-blue-400',
                'focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* CodeMirror Editor container */}
      <div
        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900"
        style={{ height: `${dynamicHeight}px` }}
      >
        {!isEditorReady && (
          <div
            className="flex items-center justify-center bg-gray-50 dark:bg-gray-900"
            style={{ height: `${dynamicHeight}px` }}
          >
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading CodeMirror editor...</span>
            </div>
          </div>
        )}

        <div
          ref={editorRef}
          className={cn(!isEditorReady && 'hidden')}
          style={{ height: `${dynamicHeight}px` }}
        />
      </div>

      {/* Code statistics and info */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span className="font-medium">
            Language: {languages.find((l) => l.value === language)?.label || language}
          </span>
          {height === 'auto' && <span>Auto-height: {dynamicHeight}px</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>Lines: {lineCount}</span>
          <span>Words: {wordCount}</span>
          <span>Characters: {characterCount}</span>
        </div>
      </div>
    </div>
  )
}

export default CustomCodeEditor
