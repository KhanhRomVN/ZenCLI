import { extractParamValue } from "../../utils/ToolParser";

export interface RunCommandParams {
  command: string;
  folder_path?: string;
}

export const parseRunCommand = (innerContent: string): RunCommandParams => {
  const command = extractParamValue(innerContent, "command") || "";
  const folderPath =
    extractParamValue(innerContent, "folder_path") || undefined;
  return { command, folder_path: folderPath };
};
