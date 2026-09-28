import { decodeHtmlEntities } from "./HtmlEntitiesDecoder";

/**
 * Params that carry multi-line file content — must NOT be trimmed so that
 * leading/trailing newlines (which are meaningful code lines) are preserved
 * when an SSE stream is split across multiple chunks.
 */
export const CONTENT_PARAMS = new Set([
  "content",
  "diff",
  "old_content",
  "new_content",
  "old_str",
  "new_str",
  "old",
  "new",
]);

export const extractParamValue = (
  content: string,
  paramName: string,
): string | null => {
  // Whether this param holds raw file content (no aggressive trimming allowed)
  const isContentParam = CONTENT_PARAMS.has(paramName);

  // Use manual tag matching to avoid regex confusion with JSX/HTML in content
  const openingTag = new RegExp(`<${paramName}(?:\\s+[^>]*)?>`, "i");
  const openingMatch = content.match(openingTag);

  if (openingMatch) {
    const startIndex = openingMatch.index! + openingMatch[0].length;

    // Find the matching closing tag by counting nested tags (balanced matching)
    const closingTag = `</${paramName}>`;

    let depth = 1;
    let searchIndex = startIndex;

    while (depth > 0 && searchIndex < content.length) {
      const nextOpening = content.indexOf(`<${paramName}`, searchIndex);
      const nextClosing = content.indexOf(closingTag, searchIndex);

      if (nextClosing === -1) {
        break;
      }

      if (nextOpening !== -1 && nextOpening < nextClosing) {
        const potentialTag = content.substring(
          nextOpening,
          nextOpening + paramName.length + 2,
        );
        if (potentialTag.match(new RegExp(`^<${paramName}(?:\\s|>)`, "i"))) {
          depth++;
          searchIndex = nextOpening + paramName.length + 1;
        } else {
          searchIndex = nextOpening + 1;
        }
      } else {
        depth--;
        if (depth === 0) {
          let value = content.substring(startIndex, nextClosing);
          // Remove ```text wrappers if present
          value = value.replace(/^```text\s*\n?|\n?```\s*$/g, "");
          const decoded = decodeHtmlEntities(value);
          const result = isContentParam
            ? decoded.replace(/^\n|\n$/g, "")
            : decoded.trim();
          return result;
        }
        searchIndex = nextClosing + closingTag.length;
      }
    }
  }

  // Fallback: Try regex-based extraction (legacy support)
  const standardRegex = new RegExp(
    `<${paramName}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${paramName}>`,
    "i",
  );
  const standardMatch = content.match(standardRegex);
  if (standardMatch) {
    let value = standardMatch[1];
    value = value.replace(/^```text\s*\n?|\n?```\s*$/g, "");
    const decoded = decodeHtmlEntities(value);
    const result = isContentParam
      ? decoded.replace(/^\n|\n$/g, "")
      : decoded.trim();
    return result;
  }
  return null;
};

/**
 * Parse tool actions. Currently a no-op passthrough since all tools
 * have dedicated parsers.
 */
export const parseToolAction = (
  toolName: string,
  _innerContent: string,
  rawXml: string,
): any => {
  const params: Record<string, any> = {};

  return {
    type: toolName as any,
    params,
    rawXml,
  };
};
