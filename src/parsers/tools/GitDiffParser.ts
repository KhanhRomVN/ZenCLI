import { extractParamValue } from "../../utils/ToolParser";

export interface GitDiffParams {
  file_path?: string;
}

export const parseGitDiff = (innerContent: string): GitDiffParams => {
  const filePath = extractParamValue(innerContent, "file_path") || undefined;
  return { file_path: filePath };
};
