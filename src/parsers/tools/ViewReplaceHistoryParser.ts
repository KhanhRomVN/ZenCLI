import { extractParamValue } from "../../utils/ToolParser";

export interface ViewReplaceHistoryParams {
  file_path: string;
}

export const parseViewReplaceHistory = (
  innerContent: string,
): ViewReplaceHistoryParams => {
  const filePath = extractParamValue(innerContent, "file_path") || "";
  return { file_path: filePath };
};
