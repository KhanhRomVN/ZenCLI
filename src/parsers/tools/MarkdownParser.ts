/**
 * Markdown parser — passthrough that strips tool result patterns.
 */
export const parseMarkdown = (innerContent: string): string => {
  if (!innerContent) return "";
  return innerContent.trim();
};