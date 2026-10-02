<div align="center">

<img src="https://raw.githubusercontent.com/KhanhRomVN/Zen/main/images/icon.png" width="120" alt="Zen Logo" />

# ZenCLI — AI Coding Agent for the Terminal

**A powerful, terminal-native AI companion to the Zen VSCode extension. Free. Open Source. No lock-in.**

[![Version](https://img.shields.io/badge/version-1.0.7-blue.svg)](https://www.npmjs.com/package/@khanhromvn/zencli)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/dm/@khanhromvn/zencli.svg)](https://www.npmjs.com/package/@khanhromvn/zencli)

> *For developers who want full AI agent capabilities directly in their shell.*

</div>

---

## Installation

### Global Install (Recommended)
To use ZenCLI anywhere on your machine, install it globally via npm:

```bash
npm install -g @khanhromvn/zencli
```

After installation, you can launch the CLI by typing `zen-cli` in any terminal folder.

### Local Project Dev Dependency
If you prefer keeping it as a dev dependency for a specific project:

```bash
npm install --save-dev @khanhromvn/zencli
```

Then run it using npx:

```bash
npx zen-cli
```

### Requirements
- Node.js >= 18.0.0
- npm, yarn, pnpm, or bun

---

## What is ZenCLI?

ZenCLI brings the intelligence of **Zen** (the popular VSCode AI extension) to your terminal. It allows you to interact with various Large Language Models (LLMs) using a rich Text User Interface (TUI) built with React and Ink.

Unlike simple chatbots, ZenCLI acts as an **autonomous agent**: it can read your codebase, edit files, run shell commands, manage Git workflows, and even install community-driven "Skills" to extend its capabilities—all while maintaining context across conversations.

### Key Differences from Standard CLI Tools
- **Rich TUI**: Not just text dumps. Enjoy syntax highlighting, interactive menus, real-time streaming, and status bars.
- **Multi-Provider Support**: Connect to Anthropic Claude, OpenAI, Qwen, Gemini, and more via API keys or shared backend accounts.
- **Agent Capabilities**: The AI doesn't just talk; it executes tools like `read_file`, `run_command`, and `replace_in_file` safely with user confirmation modes.
- **Skill Marketplace**: Extend the AI's knowledge instantly by installing specialized prompts from [mcp.directory](https://mcp.directory).

---

## Core Features

### 🤖 Multi-Model Interaction
Switch between providers and models on the fly. ZenCLI supports:
- **Anthropic Claude** (via direct SDK or proxy)
- **OpenAI / Azure OpenAI**
- **Qwen / Alibaba Cloud**
- **Local Models** (Ollama/LM Studio via compatible endpoints)
- **Any OpenAI-compatible endpoint**

Use `/model-account` to configure your active provider and credentials.

### 🛠️ Autonomous Tool Execution
The AI can perform actual work on your project:
- **File Operations**: Read, write, replace content (byte-perfect), delete, list directories, and search via grep/find.
- **Shell Command Execution**: Run builds, tests, or scripts directly from the chat interface.
- **Git Integration**: Check status, view diffs, and generate commit messages automatically.
- **Safety First**: Configure permission modes (`approval`, `fullAccess`, `readOnly`) to control how much autonomy the agent has.

### 🧩 Extensible Skills System
Unlock new abilities by installing **Skills**—pre-defined prompt templates that teach the AI specific tasks (e.g., generating PowerPoint decks, analyzing PDFs, complex refactoring patterns).
- Browse the marketplace with `/add-skill`.
- Manage installed skills with `/skill`.
- Skills are stored locally in `~/.khanhromvn-zen/skills/`.

### 💾 Persistent Conversation History
Never lose context. All chats are saved locally.
- Resume previous sessions with `/history`.
- Start fresh anytime with `/new`.
- Data is stored securely in `~/.khanhromvn-zen/projects/`.

### ⚡ Real-Time Performance Metrics
Monitor your usage live:
- Token count per message and total session cost estimation.
- Response latency tracking.
- View detailed analytics with `/analytic`.

---

## Getting Started

### 1. Launch ZenCLI
Navigate to your project directory and run:
```bash
zen-cli
```

### 2. Configure Your AI Provider
On first launch, use the slash command menu:
1. Type `/model-account` and press Enter.
2. Select your preferred provider (e.g., Anthropic, OpenAI).
3. Add your API key or select an existing account if synced with the Zen VSCode extension.

### 3. Start Coding
Simply type your request. For example:
```
Read src/index.ts and explain what this function does
```
```
Create a new utility file src/utils/date.ts with a formatDate helper
```
```
Run npm test and fix any failing assertions
```

---

## Usage Guide

### Slash Commands
Type `/` to see the available commands:

| Command | Description |
|---------|-------------|
| `/model-account` | Switch provider, model, or account |
| `/new` | Start a new conversation session |
| `/history` | Browse and load past conversations |
| `/skill` | List and manage installed skills |
| `/add-skill` | Search and install skills from marketplace |
| `/setting` | Adjust UI preferences, language, and themes |
| `/analytic` | View token usage and performance stats |
| `/exit` | Quit the application |

### Keyboard Shortcuts
- `Enter`: Send message / Confirm selection
- `Esc`: Close panels / Exit app (double tap)
- `Tab`: Toggle "Thinking Mode" (extended reasoning)
- `↑` / `↓`: Navigate lists/menus
- `?`: Show shortcut help overlay

### Permission Modes
Control the agent's autonomy via settings or inline toggles:
- **Approval (Default)**: Reads are automatic; Writes, Deletes, and Shell Commands require explicit confirmation.
- **Full Access**: The agent runs all tools without prompting (use with caution!).
- **Read Only**: The agent can inspect code but cannot modify files or run commands.

---

## Architecture & Tech Stack

ZenCLI is built for modern developer ergonomics:

- **Runtime**: Node.js (ES Modules)
- **UI Framework**: [Ink](https://github.com/vadimdemedes/ink) + React 19
- **Language**: TypeScript
- **State Management**: Custom Hooks + Context
- **Networking**: Axios / Native Fetch
- **Parsing**: Zod for schema validation, custom XML tag parsers for tool responses

### Directory Structure
```
src/
├── components/     # React UI components (Chat, Inputs, Panels)
├── services/       # Business logic (ChatService, SkillService, ApiClient)
├── handlers/       # Tool execution logic (FileOps, Git, Shell)
├── prompts/        # System prompt builders and constraints
├── types/          # TypeScript definitions
└── cli.tsx         # Entry point
```

---

## Configuration

Settings are persisted in `~/.khanhromvn-zen/settings.json`. You can modify them via the `/setting` command or manually edit the file.

Key configurations include:
- `promptLength`: Control verbosity of system prompts (`none`, `short`, `medium`, `long`).
- `codeStyle`: Influence AI behavior (`standard`, `functional`, `oop`).
- `skillsEnabled`: Toggle skill integration globally.
- `apiUrl`: Point to a self-hosted backend if managing multiple users/accounts centrally.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **"No model selected"** | Run `/model-account` to add an API key or choose a provider. |
| **Vietnamese keyboard issues** | Ensure your terminal locale is set correctly. Some IMEs may interfere with raw input capture in TUI apps. Try switching to English layout temporarily for hotkeys. |
| **Slow startup** | Clear npm cache: `npm cache clean --force`. |
| **Tool execution fails** | Check permissions. If in `ReadOnly` mode, switch to `Approval` or `Full Access`. |
| **Connection refused** | Verify your internet connection and API endpoint URLs in settings. |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by [KhanhRomVN](https://github.com/KhanhRomVN)

**Part of the Zen Ecosystem.**

[📦 Zen VSCode Extension](https://marketplace.visualstudio.com/items?itemName=KhanhRomVN.zen) • [🌐 Website](https://github.com/KhanhRomVN/Zen)

</div>