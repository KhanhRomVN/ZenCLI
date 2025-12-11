/**
 * Filter files based on relevance to user message
 * Extracts keywords and matches against file paths
 */
export function filterRelevantFiles(files: string[], userMessage: string): string[] {
  // If message is short or generic, return limited set
  if (userMessage.length < 20) {
    return files.slice(0, 20)
  }

  // Extract potential keywords from user message
  const keywords = extractKeywords(userMessage)

  if (keywords.length === 0) {
    return files.slice(0, 20)
  }

  // Score each file based on keyword matches
  const scoredFiles = files.map((file) => {
    let score = 0
    const fileLower = file.toLowerCase()
    const fileName = file.split('/').pop()?.toLowerCase() || ''

    keywords.forEach((keyword) => {
      // Exact filename match (highest priority)
      if (fileName.includes(keyword)) {
        score += 10
      }
      // Path contains keyword
      else if (fileLower.includes(keyword)) {
        score += 5
      }
      // File extension matches
      else if (keyword.startsWith('.') && fileLower.endsWith(keyword)) {
        score += 3
      }
    })

    return { file, score }
  })

  // Sort by score and return top matches
  const relevant = scoredFiles
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.file)
    .slice(0, 30) // Limit to 30 most relevant files

  // If no matches, return a small sample
  return relevant.length > 0 ? relevant : files.slice(0, 15)
}

/**
 * Extract meaningful keywords from user message
 */
function extractKeywords(message: string): string[] {
  const keywords: string[] = []

  // Common file extensions mentioned
  const extensionRegex = /\.(tsx?|jsx?|py|java|go|rs|cpp?|h|css|scss|html|json|ya?ml|md|sh)/gi
  const extensions = message.match(extensionRegex) || []
  keywords.push(...extensions.map((ext) => ext.toLowerCase()))

  // File names or paths (words with dots or slashes)
  const filePathRegex = /[\w-]+\.[\w-]+|[\w-]+\/[\w-]+/g
  const filePaths = message.match(filePathRegex) || []
  keywords.push(...filePaths.map((fp) => fp.toLowerCase()))

  // Component/class names (PascalCase words)
  const pascalCaseRegex = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g
  const pascalWords = message.match(pascalCaseRegex) || []
  keywords.push(...pascalWords.map((w) => w.toLowerCase()))

  // Technical terms and identifiers (camelCase, snake_case)
  const identifierRegex = /\b[a-z][a-zA-Z0-9_-]{2,}\b/g
  const identifiers = message.match(identifierRegex) || []

  // Filter out common words
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'this',
    'that',
    'from',
    'have',
    'will',
    'can',
    'could',
    'should',
    'would',
    'make',
    'create',
    'add',
    'update',
    'fix',
    'change',
    'remove',
    'delete',
    'get',
    'set',
    'show',
    'display',
    'file',
    'folder',
    'code',
    'function',
    'component',
    'class',
    'method'
  ])

  const meaningfulIds = identifiers
    .filter((id) => !stopWords.has(id.toLowerCase()) && id.length > 3)
    .map((id) => id.toLowerCase())

  keywords.push(...meaningfulIds)

  // Remove duplicates
  return [...new Set(keywords)]
}
