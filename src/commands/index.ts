import { Command, Flags } from "@oclif/core";
import { TerminalUI } from "../lib/terminal-ui";
import { storage } from "../lib/storage";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import { getApiClient } from "../lib/api-client";

export default class Index extends Command {
  static description = "Start ZenCLI interactive chat";
  static strict = false;
  static hidden = false;

  static examples = ["zencli", "zencli --account", "zencli --chat"];

  static flags = {
    account: Flags.boolean({
      char: "a",
      description: "Go directly to account management",
    }),
    chat: Flags.boolean({
      char: "c",
      description: "Start chat immediately",
    }),
    logs: Flags.boolean({
      char: "l",
      description: "Show log directory path",
    }),
    help: Flags.help({ char: "h" }),
    version: Flags.version({ char: "v" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Index);

    if (flags.logs) {
      await this.showLogs();
    } else if (flags.account) {
      await this.showAccountManagement();
    } else if (flags.chat) {
      await this.startChat();
    } else {
      await this.showWelcome();
    }
  }

  private async showLogs() {
    const { logger } = await import("../lib/logger");

    console.clear();
    console.log(chalk.bold.blue("📋 LOGS INFORMATION"));
    console.log();
    console.log(chalk.cyan("Log directory:"));
    console.log(chalk.bold.white(`  ${logger.getLogPath()}`));
    console.log();
    console.log(chalk.gray("To view logs, run:"));
    console.log(chalk.white(`  tail -f ${logger.getLogPath()}/zencli-*.log`));
    console.log();
    console.log(chalk.gray("Or open the directory:"));
    if (process.platform === "darwin") {
      console.log(chalk.white(`  open ${logger.getLogPath()}`));
    } else if (process.platform === "win32") {
      console.log(chalk.white(`  explorer ${logger.getLogPath()}`));
    } else {
      console.log(chalk.white(`  xdg-open ${logger.getLogPath()}`));
    }
    console.log();
  }

  private async showWelcome() {
    console.clear();

    // Display ASCII art with gradient
    const zencliArt = figlet.textSync("ZenCLI", {
      font: "Standard",
      horizontalLayout: "full",
      verticalLayout: "default",
    });

    const gradientColors = [
      { color: "#ff0000", pos: 0 },
      { color: "#ff8c00", pos: 0.2 },
      { color: "#ffeb3b", pos: 0.4 },
      { color: "#4caf50", pos: 0.6 },
      { color: "#2196f3", pos: 0.8 },
      { color: "#9c27b0", pos: 1 },
    ];

    const zencliGradient = gradient(gradientColors);
    console.log(zencliGradient.multiline(zencliArt));

    console.log(chalk.bold.magenta("✨ Claude AI Command Line Interface"));
    console.log(chalk.gray("─".repeat(60)));
    console.log();

    // Display account info
    const account = storage.getActiveAccount();
    if (account) {
      console.log(chalk.bold.green("🟢 ACTIVE ACCOUNT"));
      console.log(chalk.cyan(`👤 ${account.name}`));
      if (account.email) {
        console.log(chalk.cyan(`📧 ${account.email}`));
      }
      console.log(chalk.cyan(`🔑 ID: ${account.orgId.slice(0, 8)}...`));
    } else {
      console.log(
        chalk.yellow("⚠️  No active account. Use `zencli auth login` to login.")
      );
    }
    console.log();

    // Display available commands
    console.log(chalk.bold.blue("📖 AVAILABLE COMMANDS"));
    console.log(
      chalk.cyan("  chat                    ") +
        chalk.gray("Start interactive chat")
    );
    console.log(
      chalk.cyan("  auth login             ") +
        chalk.gray("Add new Claude account")
    );
    console.log(
      chalk.cyan("  account                ") + chalk.gray("Manage accounts")
    );
    console.log(
      chalk.cyan("  account:list           ") + chalk.gray("List all accounts")
    );
    console.log(
      chalk.cyan("  help                   ") + chalk.gray("Show help")
    );
    console.log(chalk.gray("─".repeat(60)));
    console.log();

    // Quick actions
    const inquirer = await import("inquirer");
    const { action } = await inquirer.default.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "💬 Start Chat", value: "chat" },
          { name: "🔐 Add Account", value: "add-account" },
          { name: "👥 Manage Accounts", value: "manage-accounts" },
          { name: "⚙️  Settings", value: "settings" },
          { name: "📖 Help", value: "help" },
          { name: "🚪 Exit", value: "exit" },
        ],
      },
    ]);

    switch (action) {
      case "chat":
        await this.startChat();
        break;
      case "add-account":
        await this.addAccount();
        break;
      case "manage-accounts":
        await this.showAccountManagement();
        break;
      case "settings":
        await this.showSettings();
        break;
      case "help":
        await this.showHelp();
        break;
      case "exit":
        console.log(chalk.green("👋 Goodbye!"));
        process.exit(0);
    }
  }

  private async startChat() {
    const account = storage.getActiveAccount();
    if (!account) {
      TerminalUI.showError("No active account. Please login first.");
      console.log();
      console.log(chalk.cyan("To add an account, run:"));
      console.log(chalk.bold.cyan("  zencli auth login"));
      console.log();

      const { proceed } = await import("inquirer").then((m) =>
        m.default.prompt([
          {
            type: "confirm",
            name: "proceed",
            message: "Would you like to login now?",
            default: true,
          },
        ])
      );

      if (proceed) {
        await this.addAccount();
      }
      return;
    }

    // Run chat command
    const Chat = require("./chat").default;
    await Chat.run([]);
  }

  private async addAccount() {
    try {
      console.clear();
      console.log(chalk.bold.blue("🔐 ADD NEW CLAUDE ACCOUNT"));
      console.log();

      const Auth = require("./auth").default;
      await Auth.run(["login"]);

      // Return to main menu
      console.log();
      const { back } = await import("inquirer").then((m) =>
        m.default.prompt([
          {
            type: "confirm",
            name: "back",
            message: "Return to main menu?",
            default: true,
          },
        ])
      );

      if (back) {
        await this.showWelcome();
      }
    } catch (error: any) {
      TerminalUI.showError(`Failed to add account: ${error.message}`);
      await this.showWelcome();
    }
  }

  private async showAccountManagement() {
    const accounts = storage.getAccounts();

    if (accounts.length === 0) {
      console.clear();
      console.log(chalk.yellow("⚠️  No accounts found."));
      console.log();
      console.log(chalk.cyan("To add an account, run:"));
      console.log(chalk.bold.cyan("  zencli auth login"));
      console.log();

      const { action } = await import("inquirer").then((m) =>
        m.default.prompt([
          {
            type: "list",
            name: "action",
            message: "What would you like to do?",
            choices: [
              { name: "🔐 Add Account", value: "add" },
              { name: "🔙 Back to Main Menu", value: "back" },
            ],
          },
        ])
      );

      if (action === "add") {
        await this.addAccount();
      } else {
        await this.showWelcome();
      }
      return;
    }

    // Run account command
    const Account = require("./account").default;
    await Account.run([]);
  }

  private async showSettings() {
    console.clear();
    console.log(chalk.bold.blue("⚙️  SETTINGS"));
    console.log();

    const currentModel = storage.getDefaultModel();

    const inquirer = await import("inquirer");
    const { setting } = await inquirer.default.prompt([
      {
        type: "list",
        name: "setting",
        message: "Select setting to change:",
        choices: [
          {
            name: `🤖 Default Model (Current: ${currentModel})`,
            value: "model",
          },
          { name: "🎨 Theme", value: "theme" },
          { name: "🔙 Back", value: "back" },
        ],
      },
    ]);

    if (setting === "back") {
      await this.showWelcome();
      return;
    }

    if (setting === "model") {
      await this.changeDefaultModel();
    }

    await this.showSettings();
  }

  private async changeDefaultModel() {
    const account = storage.getActiveAccount();
    if (!account) {
      TerminalUI.showError("No active account. Please login first.");
      return;
    }

    try {
      const apiClient = getApiClient();
      const models = await apiClient.getAvailableModels();

      const inquirer = await import("inquirer");
      const { model } = await inquirer.default.prompt([
        {
          type: "list",
          name: "model",
          message: "Select default model:",
          choices: models.map((m: any) => ({
            name: `${m.name} (${m.id})`,
            value: m.id,
          })),
        },
      ]);

      storage.setDefaultModel(model);
      TerminalUI.showSuccess(`Default model set to: ${model}`);
    } catch (error: any) {
      TerminalUI.showError(`Failed to get models: ${error.message}`);

      // Fallback to hardcoded models
      const models = [
        { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
        { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
        { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
      ];

      const inquirer = await import("inquirer");
      const { model } = await inquirer.default.prompt([
        {
          type: "list",
          name: "model",
          message: "Select default model:",
          choices: models.map((m) => ({
            name: `${m.name} (${m.id})`,
            value: m.id,
          })),
        },
      ]);

      storage.setDefaultModel(model);
      TerminalUI.showSuccess(`Default model set to: ${model}`);
    }
  }

  private async showHelp() {
    console.clear();
    console.log(chalk.bold.blue("📖 ZENCLI HELP"));
    console.log();

    console.log(chalk.bold.green("🚀 QUICK START"));
    console.log(chalk.gray("1. Add your first account:"));
    console.log(chalk.cyan("   zencli auth login"));
    console.log();
    console.log(chalk.gray("2. Start chatting with Claude:"));
    console.log(chalk.cyan("   zencli chat"));
    console.log();

    console.log(chalk.bold.yellow("📋 MAIN COMMANDS"));
    console.log(
      chalk.cyan("  zencli              ") + chalk.gray("Show main menu")
    );
    console.log(
      chalk.cyan("  zencli chat        ") + chalk.gray("Start interactive chat")
    );
    console.log(
      chalk.cyan("  zencli auth login  ") + chalk.gray("Add new Claude account")
    );
    console.log(
      chalk.cyan("  zencli account     ") + chalk.gray("Manage accounts")
    );
    console.log(
      chalk.cyan("  zencli --help      ") + chalk.gray("Show all commands")
    );
    console.log(
      chalk.cyan("  zencli --version   ") + chalk.gray("Show version")
    );
    console.log();

    console.log(chalk.bold.magenta("🔐 ACCOUNT MANAGEMENT"));
    console.log(
      chalk.cyan("  zencli account:list     ") + chalk.gray("List all accounts")
    );
    console.log(
      chalk.cyan("  zencli account:switch   ") +
        chalk.gray("Switch active account")
    );
    console.log(
      chalk.cyan("  zencli auth logout     ") +
        chalk.gray("Remove all accounts")
    );
    console.log();

    console.log(chalk.bold.cyan("💬 CHAT CONTROLS"));
    console.log(chalk.gray("• Type your message and press Enter to send"));
    console.log(chalk.gray("• Type /exit to quit chat"));
    console.log(chalk.gray("• Type /clear to clear screen"));
    console.log(chalk.gray("• Type /new to start new conversation"));
    console.log();

    console.log(chalk.gray("For more information, visit:"));
    console.log(chalk.cyan("  https://github.com/yourusername/zencli"));
    console.log();

    const { back } = await import("inquirer").then((m) =>
      m.default.prompt([
        {
          type: "confirm",
          name: "back",
          message: "Return to main menu?",
          default: true,
        },
      ])
    );

    if (back) {
      await this.showWelcome();
    }
  }
}
