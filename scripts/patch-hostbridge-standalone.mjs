#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Patch the generated hostbridge config file for standalone CLI
 */
function patchHostbridgeConfig() {
 const filePath = resolve(__dirname, '../src/generated/hosts/vscode/hostbridge-grpc-service-config.ts')
 
 try {
 let content = readFileSync(filePath, 'utf8')
 
 // Simple approach: replace each import line individually
 const replacements = [
 // env imports
 { 
 search: 'import { clipboardWriteText } from "@/hosts/vscode/hostbridge/env/clipboardWriteText"',
 replace: 'const clipboardWriteText = async () => ({})'
 },
 { 
 search: 'import { clipboardReadText } from "@/hosts/vscode/hostbridge/env/clipboardReadText"',
 replace: 'const clipboardReadText = async () => ({ value: "" })'
 },
 { 
 search: 'import { getHostVersion } from "@/hosts/vscode/hostbridge/env/getHostVersion"',
 replace: 'const getHostVersion = async () => ({ version: "cli-standalone" })'
 },
 { 
 search: 'import { getIdeRedirectUri } from "@/hosts/vscode/hostbridge/env/getIdeRedirectUri"',
 replace: 'const getIdeRedirectUri = async () => ({ uri: "" })'
 },
 { 
 search: 'import { getTelemetrySettings } from "@/hosts/vscode/hostbridge/env/getTelemetrySettings"',
 replace: 'const getTelemetrySettings = async () => ({ enabled: false })'
 },
 { 
 search: 'import { subscribeToTelemetrySettings } from "@/hosts/vscode/hostbridge/env/subscribeToTelemetrySettings"',
 replace: 'const subscribeToTelemetrySettings = async () => ({})'
 },
 { 
 search: 'import { shutdown } from "@/hosts/vscode/hostbridge/env/shutdown"',
 replace: 'const shutdown = async () => ({})'
 },
 
 // window imports
 { 
 search: 'import { showTextDocument } from "@/hosts/vscode/hostbridge/window/showTextDocument"',
 replace: 'const showTextDocument = async () => ({})'
 },
 { 
 search: 'import { showOpenDialogue } from "@/hosts/vscode/hostbridge/window/showOpenDialogue"',
 replace: 'const showOpenDialogue = async () => ({})'
 },
 { 
 search: 'import { showMessage } from "@/hosts/vscode/hostbridge/window/showMessage"',
 replace: 'const showMessage = async () => ({})'
 },
 { 
 search: 'import { showInputBox } from "@/hosts/vscode/hostbridge/window/showInputBox"',
 replace: 'const showInputBox = async () => ({ value: "" })'
 },
 { 
 search: 'import { showSaveDialog } from "@/hosts/vscode/hostbridge/window/showSaveDialog"',
 replace: 'const showSaveDialog = async () => ({})'
 },
 { 
 search: 'import { openFile } from "@/hosts/vscode/hostbridge/window/openFile"',
 replace: 'const openFile = async () => ({})'
 },
 { 
 search: 'import { openSettings } from "@/hosts/vscode/hostbridge/window/openSettings"',
 replace: 'const openSettings = async () => ({})'
 },
 { 
 search: 'import { getOpenTabs } from "@/hosts/vscode/hostbridge/window/getOpenTabs"',
 replace: 'const getOpenTabs = async () => ({ tabs: [] })'
 },
 { 
 search: 'import { getVisibleTabs } from "@/hosts/vscode/hostbridge/window/getVisibleTabs"',
 replace: 'const getVisibleTabs = async () => ({ tabs: [] })'
 },
 { 
 search: 'import { getActiveEditor } from "@/hosts/vscode/hostbridge/window/getActiveEditor"',
 replace: 'const getActiveEditor = async () => ({})'
 },
 
 // workspace imports
 { 
 search: 'import { getWorkspacePaths } from "@/hosts/vscode/hostbridge/workspace/getWorkspacePaths"',
 replace: 'const getWorkspacePaths = async () => ({ paths: [] })'
 },
 { 
 search: 'import { saveOpenDocumentIfDirty } from "@/hosts/vscode/hostbridge/workspace/saveOpenDocumentIfDirty"',
 replace: 'const saveOpenDocumentIfDirty = async () => ({})'
 },
 { 
 search: 'import { getDiagnostics } from "@/hosts/vscode/hostbridge/workspace/getDiagnostics"',
 replace: 'const getDiagnostics = async () => ({ diagnostics: [] })'
 },
 { 
 search: 'import { openProblemsPanel } from "@/hosts/vscode/hostbridge/workspace/openProblemsPanel"',
 replace: 'const openProblemsPanel = async () => ({})'
 },
 { 
 search: 'import { openInFileExplorerPanel } from "@/hosts/vscode/hostbridge/workspace/openInFileExplorerPanel"',
 replace: 'const openInFileExplorerPanel = async () => ({})'
 },
 { 
 search: 'import { openClineSidebarPanel } from "@/hosts/vscode/hostbridge/workspace/openClineSidebarPanel"',
 replace: 'const openClineSidebarPanel = async () => ({})'
 },
 { 
 search: 'import { openTerminalPanel } from "@/hosts/vscode/hostbridge/workspace/openTerminalPanel"',
 replace: 'const openTerminalPanel = async () => ({})'
 },
 { 
 search: 'import { executeCommandInTerminal } from "@/hosts/vscode/hostbridge/workspace/executeCommandInTerminal"',
 replace: 'const executeCommandInTerminal = async () => ({})'
 }
 ]
 
 // Apply all replacements
 for (const { search, replace } of replacements) {
 content = content.replace(search, replace)
 }
 
 writeFileSync(filePath, content)
 console.log('✅ Successfully patched hostbridge-grpc-service-config.ts for standalone CLI')
 } catch (error) {
 console.error('❌ Error patching hostbridge config:', error.message)
 process.exit(1)
 }
}

// Run the patch if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
 patchHostbridgeConfig()
}
