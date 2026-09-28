import { extractParamValue } from "../../utils/ToolParser";

export interface ListFilesParams {
  folder_path: string;
  depth?: string;
}

export const parseListFiles = (innerContent: string): ListFilesParams => {
  const folderPath = extractParamValue(innerContent, "folder_path") || "";
  const depth = extractParamValue(innerContent, "depth") || undefined;
  return { folder_path: folderPath, depth };
};
