import { CORE } from './core'
import { TOOLS } from './tools'
import { RULES } from './rules'
import { SYSTEM } from './system'

// Export individual modules
export { CORE } from './core'
export { TOOLS } from './tools'
export { RULES } from './rules'
export { SYSTEM, buildSystemPrompt } from './system'
export type { SystemInfo } from './system'

export const combinePrompts = (): string => {
  return [CORE, TOOLS, RULES, SYSTEM].join('\n\n')
}

export const buildFullPrompt = (systemInfo: {
  os: string
  shell: string
  homeDir: string
  cwd: string
}): string => {
  const { buildSystemPrompt } = require('./system')
  const dynamicSystem = buildSystemPrompt(systemInfo)

  return [CORE, TOOLS, RULES, dynamicSystem].join('\n\n')
}

export const DEFAULT_CLI_PROMPT = combinePrompts()
