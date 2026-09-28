import { extractParamValue } from "../../utils/ToolParser";

export interface FindFilesParams {
  file_name: string;
  folder_path?: string;
}

export const parseFindFiles = (innerContent: string): FindFilesParams => {
  const fileName = extractParamValue(innerContent, "file_name") || "";
  const folderPath =
    extractParamValue(innerContent, "folder_path") || undefined;
  return { file_name: fileName, folder_path: folderPath };
};
