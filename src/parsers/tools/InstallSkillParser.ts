import { extractParamValue } from "../../utils/ToolParser.js";

export interface InstallSkillParams {
  slug: string;
}

export const parseInstallSkill = (innerContent: string): InstallSkillParams => {
  const slug = extractParamValue(innerContent, "slug") || "";
  return { slug };
};
