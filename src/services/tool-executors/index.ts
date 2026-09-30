/**
 * Tool Executor Factory for ZenCLI.
 * Maps action.type → concrete executor instance.
 */

import type { ToolExecutor } from "../../types/executor-types";
import { ReadFileExecutor } from "./ReadFileExecutor";
import { WriteToFileExecutor } from "./WriteToFileExecutor";
import { ReplaceInFileExecutor } from "./ReplaceInFileExecutor";
import { DeleteFileExecutor } from "./DeleteFileExecutor";
import { ListFilesExecutor } from "./ListFilesExecutor";
import { FindFilesExecutor } from "./FindFilesExecutor";
import { GrepExecutor } from "./GrepExecutor";
import { RunCommandExecutor } from "./RunCommandExecutor";
import { GitStatusExecutor } from "./GitStatusExecutor";
import { GitDiffExecutor } from "./GitDiffExecutor";
import { CommitMessageExecutor } from "./CommitMessageExecutor";
import { RevertFileExecutor } from "./RevertFileExecutor";
import { ViewReplaceHistoryExecutor } from "./ViewReplaceHistoryExecutor";
import { SearchSkillExecutor } from "./SearchSkillExecutor";
import { ListSkillExecutor } from "./ListSkillExecutor";
import { ReadSkillExecutor } from "./ReadSkillExecutor";
import { InstallSkillExecutor } from "./InstallSkillExecutor";
import { ConversationTitleExecutor } from "./ConversationTitleExecutor";

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