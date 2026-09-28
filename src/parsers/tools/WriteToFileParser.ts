import { extractParamValue } from "../../utils/ToolParser";

export interface WriteToFileParams {
  file_path: string;
  content: string;
  /** Tên tool gốc trước khi convert (vd: "create_file" từ Claude) */
  original_tool_name?: string;
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

export const parseWriteToFile = (
  innerContent: string,
): WriteToFileParams & { isError?: boolean; errorMessage?: string } => {
  const filePath = extractParamValue(innerContent, "file_path");
  const content = extractParamValue(innerContent, "content");
  const originalToolName =
    extractParamValue(innerContent, "original_tool_name") || undefined;

  // Check for missing closing tags
  const missingClosingTags: string[] = [];

  if (!filePath) {
    const missingTag = detectMissingClosingTag(innerContent, "file_path", [
      "path",
    ]);
    if (missingTag) {
      missingClosingTags.push(missingTag);
    }
  }

  if (!content) {
    const missingTag = detectMissingClosingTag(innerContent, "content");
    if (missingTag) {
      missingClosingTags.push(missingTag);
    }
  }

  if (missingClosingTags.length > 0) {
    return {
      file_path: filePath || "",
      content: content || "",
      original_tool_name: originalToolName,
      isError: true,
      errorMessage: `Missing closing tag(s): ${missingClosingTags.map((tag) => `</${tag}>`).join(", ")}`,
    };
  }

  // Validate required parameters
  const missingParams: string[] = [];
  if (!filePath || filePath.trim() === "") {
    missingParams.push("file_path");
  }
  if (!content || content.trim() === "") {
    missingParams.push("content");
  }

  if (missingParams.length > 0) {
    return {
      file_path: filePath || "",
      content: content || "",
      original_tool_name: originalToolName,
      isError: true,
      errorMessage: `Missing required parameter(s): ${missingParams.join(", ")}`,
    };
  }

  return {
    file_path: filePath || "",
    content: content || "",
    original_tool_name: originalToolName,
  };
};
