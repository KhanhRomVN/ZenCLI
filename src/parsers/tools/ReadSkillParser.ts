import { extractParamValue } from "../../utils/ToolParser.js";

export interface ReadSkillParams {
  slug: string;
}

export const parseReadSkill = (innerContent: string): ReadSkillParams => {
  const slug = extractParamValue(innerContent, "slug") || "";
  return { slug };
};
