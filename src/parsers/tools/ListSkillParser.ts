/**
 * Parse <list_skill> tag — no parameters required.
 */
export interface ListSkillParams {
  [key: string]: never;
}

export const parseListSkill = (_innerContent: string): ListSkillParams => {
  return {};
};