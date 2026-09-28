import { extractParamValue } from "../../utils/ToolParser";

export interface RevertFileParams {
  file_path: string;
  version?: number;
}

export const parseRevertFile = (innerContent: string): RevertFileParams => {
  const filePath = extractParamValue(innerContent, "file_path") || "";
  const version = extractParamValue(innerContent, "version");
  return {
    file_path: filePath,
    version: version ? parseInt(version, 10) : undefined,
  };
};
