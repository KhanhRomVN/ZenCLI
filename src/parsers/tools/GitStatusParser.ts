import { extractParamValue } from "../../utils/ToolParser";

export interface GitStatusItem {
  status: string;
  path: string;
  staged?: boolean;
  added?: number;
  deleted?: number;
  isUnpushedCommit?: boolean;
}

export interface GitStatusParams {
  items?: GitStatusItem[] | string;
  branch?: string;
  raw?: string;
}

export const parseGitStatus = (innerContent: string): GitStatusParams => {
  const items = extractParamValue(innerContent, "items");
  const branch = extractParamValue(innerContent, "branch") || undefined;
  const raw = extractParamValue(innerContent, "raw") || undefined;

  let parsedItems: GitStatusItem[] | string | undefined;
  if (items) {
    try {
      parsedItems = JSON.parse(items);
    } catch {
      parsedItems = items;
    }
  }

  return { items: parsedItems, branch, raw };
};
