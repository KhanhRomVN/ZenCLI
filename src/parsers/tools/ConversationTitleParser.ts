/**
 * Parse <conversation_title> tag content.
 */
export const parseConversationTitle = (
  innerContent: string,
): { title: string } => {
  return { title: (innerContent || "").trim() };
};