/**
 * LiteLLM Wrapper - Special prompt wrapper for LiteLLM provider only
 * This wrapper adds JSON formatting requirements specifically for LiteLLM
 */

export class LiteLLMWrapper {
  /**
   * Wrap the original prompt with LiteLLM-specific JSON formatting requirements
   * This ensures LiteLLM returns responses in the exact JSON format needed
   */
  static wrapSessionPrompt(originalPrompt: string): string {
    return `${originalPrompt}

CRITICAL LITELLM RESPONSE FORMAT RULES:
1. You MUST return ONLY valid JSON data
2. The JSON MUST be wrapped in \`\`\`json ... \`\`\` code blocks
3. Do NOT include any explanatory text, comments, or markdown outside the JSON block
4. Ensure all JSON fields are properly formatted and escaped
5. Use double quotes for all JSON strings
6. Return the exact JSON structure as specified in the prompt

IMPORTANT: Your response should look exactly like this:
\`\`\`json
{
 "questions": [
 {
 "question_type": "TYPE_HERE",
 "context": "Vietnamese context here",
 "difficulty_level": 5,
 // ... other required fields
 }
 ]
}
\`\`\`

Remember: Return ONLY the JSON block, nothing else.`
  }

  /**
   * Wrap vocabulary prompt for LiteLLM
   */
  static wrapVocabularyPrompt(originalPrompt: string): string {
    return `${originalPrompt}

CRITICAL LITELLM RESPONSE FORMAT RULES:
1. You MUST return ONLY valid JSON data
2. The JSON MUST be wrapped in \`\`\`json ... \`\`\` code blocks
3. Do NOT include any explanatory text, comments, or markdown outside the JSON block
4. Ensure all JSON fields are properly formatted and escaped
5. Use double quotes for all JSON strings

IMPORTANT: Your response should look exactly like this:
\`\`\`json
{
 "word": "word_here",
 "pronunciation": "pronunciation_here",
 // ... other required fields
}
\`\`\`

Remember: Return ONLY the JSON block, nothing else.`
  }

  /**
   * Wrap phrase prompt for LiteLLM
   */
  static wrapPhrasePrompt(originalPrompt: string): string {
    return `${originalPrompt}

CRITICAL LITELLM RESPONSE FORMAT RULES:
1. You MUST return ONLY valid JSON data
2. The JSON MUST be wrapped in \`\`\`json ... \`\`\` code blocks
3. Do NOT include any explanatory text, comments, or markdown outside the JSON block
4. Ensure all JSON fields are properly formatted and escaped
5. Use double quotes for all JSON strings

IMPORTANT: Your response should look exactly like this:
\`\`\`json
{
 "phrase": "phrase_here",
 "pronunciation": "pronunciation_here",
 // ... other required fields
}
\`\`\`

Remember: Return ONLY the JSON block, nothing else.`
  }

  /**
   * Wrap grammar prompt for LiteLLM
   */
  static wrapGrammarPrompt(originalPrompt: string): string {
    return `${originalPrompt}

CRITICAL LITELLM RESPONSE FORMAT RULES:
1. You MUST return ONLY valid JSON data
2. The JSON MUST be wrapped in \`\`\`json ... \`\`\` code blocks
3. Do NOT include any explanatory text, comments, or markdown outside the JSON block
4. Ensure all JSON fields are properly formatted and escaped
5. Use double quotes for all JSON strings

IMPORTANT: Your response should look exactly like this:
\`\`\`json
{
 "title": "grammar_title_here",
 "item_type": "rule",
 // ... other required fields
}
\`\`\`

Remember: Return ONLY the JSON block, nothing else.`
  }

  /**
   * Check if we should apply LiteLLM wrapper based on provider type
   */
  static shouldApplyWrapper(providerType: string): boolean {
    return providerType === 'LITELLM'
  }
}
