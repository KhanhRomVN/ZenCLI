/**
 * Tag and Tool Type Definitions
 * Adapted from Zen for ZenCLI — no vscode dependencies.
 */

// ============= PERMISSION TYPES =============

export type PermissionMode = "fullAccess" | "approval";
export type PermissionValue = "allow" | "confirm" | "reject" | RegExp;

// ============= TAG TYPES =============

export type TagCategory = "tool" | "ui";

export interface TagDefinition {
  id: string;
  title?: string | null;
  category: TagCategory;

  // Only tools have permissions
  permissions?: {
    approval: PermissionValue;
    fullAccess: PermissionValue;
  };

  timeout?: number;

  features?: {
    showFileStats?: boolean;
    validateFuzzyMatch?: boolean;
    isFileMutation?: boolean;
  };
}

export type ToolType = string;
export type UITagType = string;
export type TagType = string;