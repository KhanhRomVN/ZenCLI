#!/usr/bin/env node

/**
 * Cleanup script: removes all .js and .js.map files from temp/claude-code/src.
 * These are compiled artifacts that shouldn't be in the source tree.
 *
 * Usage: node scripts/cleanup-claude-code.js
 */

import { readdir, unlink, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const TARGET_DIR = join(process.cwd(), 'temp', 'claude-code', 'src')
const EXTENSIONS_TO_DELETE = new Set(['.js', '.map'])

let deletedCount = 0
let errorCount = 0

async function walkAndClean(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    console.error(`❌ Cannot read directory: ${dir}`)
    console.error(`   ${err.message}`)
    errorCount++
    return
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      await walkAndClean(fullPath)
    } else if (entry.isFile()) {
      const ext = extname(entry.name)
      // Match .js and .js.map (extname returns .map for .js.map)
      const isJsMap = entry.name.endsWith('.js.map')
      const isJs = ext === '.js' && !isJsMap

      if (isJs || isJsMap) {
        try {
          await unlink(fullPath)
          deletedCount++
          console.log(`🗑️  Deleted: ${fullPath}`)
        } catch (err) {
          console.error(`❌ Failed to delete: ${fullPath}`)
          console.error(`   ${err.message}`)
          errorCount++
        }
      }
    }
  }
}

async function main() {
  console.log(`🔍 Scanning: ${TARGET_DIR}\n`)

  try {
    const dirStat = await stat(TARGET_DIR)
    if (!dirStat.isDirectory()) {
      console.error(`❌ Not a directory: ${TARGET_DIR}`)
      process.exit(1)
    }
  } catch {
    console.error(`❌ Directory not found: ${TARGET_DIR}`)
    process.exit(1)
  }

  await walkAndClean(TARGET_DIR)

  console.log(`\n✅ Done! Deleted ${deletedCount} file(s).`)
  if (errorCount > 0) {
    console.error(`⚠️  ${errorCount} error(s) occurred.`)
    process.exit(1)
  }
}

main()