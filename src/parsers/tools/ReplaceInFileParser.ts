import { extractParamValue } from "../../utils/ToolParser";

export interface ReplaceInFileParams {
  file_path: string;
  old_content: string;
  new_content: string;
  _validationError?: string;
  /** Tên tool gốc của claude trước khi convert (vd: "str_replace") */
  original_tool_name?: string;
  /** Sandbox path gốc của claude trước khi map về workspace */
  original_path?: string;
}

/**
 * Helper function to detect missing closing tag
 */
const detectMissingClosingTag = (
  content: string,
  paramName: string,
  alternativeNames: string[] = [],
): string | null => {
  const allNames = [paramName, ...alternativeNames];

  for (const name of allNames) {
    const openingTag = new RegExp(`<${name}(?:\\s+[^>]*)?>`, "i");
    const hasOpening = openingTag.test(content);

    if (hasOpening) {
      const closingTag = `</${name}>`;
      const hasClosing = content.includes(closingTag);

      if (!hasClosing) {
        return name;
      }
    }
  }

  return null;
};

export const parseReplaceInFile = (
  innerContent: string,
): ReplaceInFileParams => {
  let filePath = extractParamValue(innerContent, "file_path");
  let oldContent = extractParamValue(innerContent, "old_content");
  let newContent = extractParamValue(innerContent, "new_content");
  const originalToolName =
    extractParamValue(innerContent, "original_tool_name") || undefined;
  const originalPath =
    extractParamValue(innerContent, "original_path") || undefined;

  // Fallback: Try alternative tag names
  if (!filePath) {
    filePath = extractParamValue(innerContent, "path");
  }
  if (!oldContent) {
    oldContent = extractParamValue(innerContent, "old");
  }
  if (!newContent) {
    newContent = extractParamValue(innerContent, "new");
  }

  // Additional fallback: plain text format
  if (!filePath || !oldContent || !newContent) {
    const plainTextMatch = innerContent.match(/file_path:\s*([^\n]+)/i);
    if (plainTextMatch && !filePath) {
      filePath = plainTextMatch[1].trim();
    }
  }

  // Check for missing closing tags
  const missingClosingTags: string[] = [];

  if (!filePath) {
    const missingTag = detectMissingClosingTag(innerContent, "file_path", [
      "path",
    ]);
    if (missingTag) missingClosingTags.push(missingTag);
  }
  if (!oldContent) {
    const missingTag = detectMissingClosingTag(innerContent, "old_content", [
      "old",
    ]);
    if (missingTag) missingClosingTags.push(missingTag);
  }
  if (!newContent) {
    const missingTag = detectMissingClosingTag(innerContent, "new_content", [
      "new",
    ]);
    if (missingTag) missingClosingTags.push(missingTag);
  }

  if (missingClosingTags.length > 0) {
    const tagList = missingClosingTags.map((tag) => `</${tag}>`).join(", ");
    const errorMsg = `Missing closing tag(s): ${tagList}`;
    return {
      file_path: filePath || "",
      old_content: oldContent || "",
      new_content: newContent || "",
      _validationError: errorMsg,
    };
  }

  // Validate required parameters
  const missingParams: string[] = [];
  if (!filePath || filePath.trim() === "") missingParams.push("file_path");
  if (!oldContent || oldContent.trim() === "")
    missingParams.push("old_content");
  if (!newContent || newContent.trim() === "")
    missingParams.push("new_content");

  if (missingParams.length > 0) {
    const errorMsg = `Missing required parameter(s): ${missingParams.join(", ")}`;
    return {
      file_path: filePath || "",
      old_content: oldContent || "",
      new_content: newContent || "",
      _validationError: errorMsg,
    };
  }

  return {
    file_path: filePath || "",
    old_content: oldContent || "",
    new_content: newContent || "",
    original_tool_name: originalToolName,
    original_path: originalPath,
  };
};
