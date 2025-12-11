export const TOOLS = `TOOLS REFERENCE (CLI Version - Compressed Format)

FILE OPERATIONS

Read(file_path: string, offset?: number, limit?: number)
- Read file content from local system
- MUST use before any Edit
- offset: Starting line number (optional)
- limit: Number of lines to read (optional)
- Supports: text, images (PNG/JPG), Jupyter notebooks (.ipynb)
- Lines longer than 2000 chars will be truncated
- Result: 'cat -n' format with line numbers
- Example: Read("/home/user/project/src/app.ts")
- Example: Read("/home/user/project/data.csv", offset=100, limit=50)

Write(file_path: string, content: string)
- Create new file OR overwrite existing file
- Use for: new files, complete rewrites
- NOTE: This tool OVERWRITES entire file
- Prefer Edit for existing files
- Example: Write("/home/user/project/new.ts", "export const x = 1;")

Edit(file_path: string, old_string: string, new_string: string)
- Perform EXACT string replacement in file
- "Surgical string replacement" - only replaces exact match
- old_string: Old string to replace (MUST match EXACTLY)
- new_string: New string to replace with
- CRITICAL: old_string must match 100% (including spaces, tabs, line breaks)
- Example: Edit("/home/user/app.ts", "const x = 1;", "const x = 2;")

LS(path: string)
- List files/directories
- Replaces bash commands: ls, head, tail
- Example: LS("/home/user/project")
- Example: LS("/home/user/project/src")

Glob(pattern: string)
- Find files by pattern (replaces 'find' command)
- pattern: Glob pattern to match files
- Example: Glob("**/*.ts") - find all .ts files
- Example: Glob("src/**/*.test.ts") - find test files in src

Grep(pattern: string, output_mode?: string, context_lines?: number)
- Search content in files (replaces 'grep' command)
- pattern: Regex pattern to search
- output_mode: "files_with_matches" | "content" | ...
- context_lines (-C): Number of context lines before/after
- Example: Grep("function.*export", output_mode="content")
- Example: Grep("TODO", output_mode="files_with_matches")
- NOTE: Claude Code recommends using 'ripgrep (rg)' instead of regular grep

EXECUTION

Bash(command: string, requires_approval: boolean)
- Run shell command in CWD
- requires_approval: true for destructive ops (delete, install, config)
- requires_approval: false for safe ops (read, build, run)
- Supports command chaining: cd dir && npm install
- Example: Bash("npm run dev", false)
- Example: Bash("rm -rf node_modules", true)

COMMUNICATION

AskFollowupQuestion(question: string, options?: string[])
- Ask user when CRITICAL information is missing
- options: Array of 2-5 choices (optional)
- DO NOT ask about optional parameters
- Example: AskFollowupQuestion("Which file to fix?", ["src/app.ts", "src/utils.ts"])

AttemptCompletion(result: string, command?: string)
- Present final result (ONLY after user confirms success)
- command: Demo command (npm run dev, open file, etc)
- DO NOT end with questions
- Example: AttemptCompletion("Completed feature X", "npm run dev")

TOOL PRIORITIES & BEST PRACTICES

CRITICAL RULES:
1. AVOID bash commands for file search
   ❌ Bash("find . -name '*.ts'")
   ✓ Glob("**/*.ts")

2. AVOID bash commands for file read
   ❌ Bash("cat file.ts")
   ✓ Read("/absolute/path/file.ts")

3. AVOID bash commands for grep
   ❌ Bash("grep -r 'pattern' .")
   ✓ Grep("pattern")

4. ALWAYS use absolute paths
   ❌ Read("./src/app.ts")
   ✓ Read("/home/user/project/src/app.ts")

Tool Priority (Explanation):
- Specialized tools (Read, Write, Edit, Glob, Grep, LS) are optimized for Claude Code
- Save tokens and context
- More accurate results
- Better integration with permission system
- ONLY use Bash when NO specialized tool available

Write vs Edit:
- Write: New files, complete rewrite, small files (changes >50%)
- Edit (DEFAULT): Existing files, targeted edits, large files (changes <50%)

Multiple Changes on Same File:
❌ Multiple Edit calls (violates one-tool-per-message)
✓ Multiple Edit calls BUT each call = separate message
✓ Or rewrite entire file with Write if many changes

Task Progress (Optional for all tools):
- Can be added to ANY tool call
- Display progress silently
- Format: checklist markdown
- Keep focused (meaningful milestones only)`
