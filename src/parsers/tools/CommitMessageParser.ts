import { extractParamValue } from "../../utils/ToolParser";

export interface CommitMessageParams {
  message?: string;
  content?: string;
}

export const parseCommitMessage = (
  innerContent: string,
): CommitMessageParams => {
  const message = extractParamValue(innerContent, "message") || undefined;
  const content = extractParamValue(innerContent, "content") || undefined;
  return { message, content };
};
