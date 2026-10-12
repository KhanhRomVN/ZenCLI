/**
 * ------------------------------------------------------------------
 * Tool Executor Factory
 * ------------------------------------------------------------------
 * Nhà máy sản xuất (Factory Pattern) ánh xạ tên loại hành động (action.type) 
 * sang Instance cụ thể của Class thực thi tương ứng.
 *
 * Main functions:
 * - getExecutor() : Trả về object ToolExecutor phù hợp hoặc null nếu không tìm thấy
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types 
import type { ToolExecutor } from "../../types/executor-types.js";

// ── Executors ─
import { ReadFileExecutor } from "./ReadFileExecutor.js";
import { WriteToFileExecutor } from "./WriteToFileExecutor.js";
import { ReplaceInFileExecutor } from "./ReplaceInFileExecutor.js";
import { DeleteFileExecutor } from "./DeleteFileExecutor.js";
import { ListFilesExecutor } from "./ListFilesExecutor.js";
import { FindFilesExecutor } from "./FindFilesExecutor.js";
import { GrepExecutor } from "./GrepExecutor.js";
import { RunCommandExecutor } from "./RunCommandExecutor.js";
import { GitStatusExecutor } from "./GitStatusExecutor.js";
import { GitDiffExecutor } from "./GitDiffExecutor.js";
import { CommitMessageExecutor } from "./CommitMessageExecutor.js";
import { RevertFileExecutor } from "./RevertFileExecutor.js";
import { ViewReplaceHistoryExecutor } from "./ViewReplaceHistoryExecutor.js";
import { SearchSkillExecutor } from "./SearchSkillExecutor.js";
import { ListSkillExecutor } from "./ListSkillExecutor.js";
import { ReadSkillExecutor } from "./ReadSkillExecutor.js";
import { InstallSkillExecutor } from "./InstallSkillExecutor.js";
import { ConversationTitleExecutor } from "./ConversationTitleExecutor.js";

// ─── Functions ──────────────────────────────────────────────────────────
export function getExecutor(actionType: string): ToolExecutor | null {
  switch (actionType) {
    case "read_file":
      return new ReadFileExecutor();
    case "write_to_file":
      return new WriteToFileExecutor();
    case "replace_in_file":
      return new ReplaceInFileExecutor();
    case "delete_file":
      return new DeleteFileExecutor();
    case "list_files":
      return new ListFilesExecutor();
    case "find_files":
      return new FindFilesExecutor();
    case "grep":
      return new GrepExecutor();
    case "run_command":
      return new RunCommandExecutor();
    case "git_status":
      return new GitStatusExecutor();
    case "git_diff":
      return new GitDiffExecutor();
    case "commit_message":
      return new CommitMessageExecutor();
    case "revert_file":
      return new RevertFileExecutor();
    case "view_replace_history":
      return new ViewReplaceHistoryExecutor();
    case "search_skill":
      return new SearchSkillExecutor();
    case "list_skill":
      return new ListSkillExecutor();
    case "read_skill":
      return new ReadSkillExecutor();
    case "install_skill":
      return new InstallSkillExecutor();
    case "conversation_title":
      return new ConversationTitleExecutor();
    default:
      console.warn(`[ZenCLI][tool] No executor found for action type: "${actionType}"`);
      return null;
  }
}