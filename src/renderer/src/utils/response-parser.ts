/**
 * Parse Claude response that may contain bash code blocks
 * Extracts content from ```bash blocks and returns cleaned text
 */
export function parseClaudeResponse(rawResponse: string): string {
  // Match all bash code blocks
  const bashBlockRegex = /```bash\n([\s\S]*?)```/g
  const matches = [...rawResponse.matchAll(bashBlockRegex)]

  if (matches.length === 0) {
    // No bash blocks found, return original response
    return rawResponse
  }

  // Extract content from all bash blocks and join with newlines
  const extractedContent = matches
    .map((match) => match[1].trim())
    .filter((content) => content.length > 0)
    .join('\n\n')

  return extractedContent || rawResponse
}
