import { extractParamValue } from "../../utils/ToolParser.js";

export interface SearchSkillParams {
  search_term: string;
}

export const parseSearchSkill = (innerContent: string): SearchSkillParams => {
  const searchTerm = extractParamValue(innerContent, "search_term") || "";
  return { search_term: searchTerm };
};
