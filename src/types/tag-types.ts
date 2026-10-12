/**
 * ------------------------------------------------------------------
 * Tag & Tool Types
 * ------------------------------------------------------------------
 * Định nghĩa hệ thống phân loại Tag (Tool vs UI) và cơ chế cấp quyền (Permission).
 * Dùng để điều phối cách xử lý các khối XML trong output của AI.
 *
 * Main types:
 * - PermissionMode   : Chế độ hoạt động chung (Full Access hay Ask Approval)
 * - TagDefinition    : Mô tả chi tiết thuộc tính của một Tag cụ thể
 * - ToolType/UitTagType : Alias tiện lợi cho việc khai báo biến
 * ------------------------------------------------------------------
 */

// ─── Types & Interfaces ────────────────────────────────────────────────
export type PermissionMode = "fullAccess" | "approval";
export type PermissionValue = "allow" | "confirm" | "reject" | RegExp;

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