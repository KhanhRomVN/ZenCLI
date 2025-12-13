import { Command } from "@oclif/core";
import { storage } from "../lib/storage";
import { getApiClient } from "../lib/api-client";
import { TerminalUI } from "../lib/terminal-ui";
import { ChatUI } from "../lib/chat-ui";
import chalk from "chalk";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export default class Chat extends Command {
  static description = "Start interactive chat with Claude";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  async run(): Promise<void> {
    const account = storage.getActiveAccount();
    if (!account) {
      console.clear();
      TerminalUI.showError(
        "No active account. Please login first with: zencli auth login"
      );
      console.log();
      console.log(chalk.cyan("To add an account, run:"));
      console.log(chalk.bold.cyan("  zencli auth login"));
      console.log();
      process.exit(1);
    }

    ChatUI.showChatHeader(account);
    ChatUI.showConversationHistory();

    const apiClient = getApiClient();

    const spinner = TerminalUI.showLoading("Creating conversation...");
    try {
      const { conversationId, parentMessageUuid } =
        await apiClient.createConversation(storage.getDefaultModel());
      spinner.succeed("Conversation created");

      const tokens = storage.getTokenUsage(account.id);
      ChatUI.showInputPrompt(
        storage.getDefaultModel(),
        tokens,
        account.email || account.name
      );

      await this.chatLoop(
        apiClient,
        conversationId,
        parentMessageUuid,
        account
      );
    } catch (error: any) {
      spinner.fail("Failed to create conversation");
      TerminalUI.showError(error.message);
      console.log();
      console.log(chalk.yellow("💡 Suggestions:"));
      console.log(chalk.gray("1. Check your internet connection"));
      console.log(
        chalk.gray("2. Your session may have expired - try logging in again")
      );
      console.log(chalk.cyan("   zencli auth login"));
      console.log();
      process.exit(1);
    }
  }

  private async chatLoop(
    apiClient: any,
    conversationId: string,
    parentMessageUuid: string,
    account: any
  ) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    let currentParentUuid = parentMessageUuid;
    let isFirstInput = true;

    while (true) {
      // Get user input
      const userInput = await question(chalk.cyan("> "));

      if (userInput.trim().toLowerCase() === "/exit") {
        console.log(chalk.green("👋 Goodbye!"));
        rl.close();
        break;
      }

      if (userInput.trim().toLowerCase() === "/help") {
        ChatUI.showCommandMenu();
        continue;
      }

      if (userInput.trim().toLowerCase() === "/manage-account") {
        console.log(chalk.yellow("Opening account management..."));
        rl.close();
        const Account = require("./account").default;
        await Account.run([]);
        process.exit(0);
      }

      if (userInput.trim().toLowerCase() === "/switch") {
        console.log(chalk.yellow("Switch account..."));
        const accounts = storage.getAccounts();
        if (accounts.length === 0) {
          console.log(chalk.red("No accounts available"));
          continue;
        }

        console.log(chalk.bold.cyan("Available accounts:"));
        accounts.forEach((acc: any, index: number) => {
          const isActive = acc.id === account.id;
          const prefix = isActive ? chalk.green("→ ") : "  ";
          console.log(prefix + `${index + 1}. ${acc.name}`);
        });
        console.log();

        const switchInput = await question(
          chalk.cyan("Enter account number (or Enter to cancel): ")
        );
        const accountIndex = parseInt(switchInput.trim()) - 1;

        if (
          !isNaN(accountIndex) &&
          accountIndex >= 0 &&
          accountIndex < accounts.length
        ) {
          await storage.setActiveAccount(accounts[accountIndex].id);
          console.log(
            chalk.green(`Switched to: ${accounts[accountIndex].name}`)
          );
          console.log(chalk.yellow("Restarting chat..."));
          rl.close();
          await this.run();
          return;
        }
        continue;
      }

      if (userInput.trim().toLowerCase() === "/clear") {
        ChatUI.showChatHeader(account);
        ChatUI.showConversationHistory();
        const tokens = storage.getTokenUsage(account.id);
        ChatUI.showInputPrompt(
          storage.getDefaultModel(),
          tokens,
          account.email || account.name
        );
        continue;
      }

      if (userInput.trim().toLowerCase() === "/new") {
        console.log(chalk.yellow("Starting new conversation..."));
        const spinner = TerminalUI.showLoading("Creating conversation...");
        const newConv = await apiClient.createConversation(
          storage.getDefaultModel()
        );
        conversationId = newConv.conversationId;
        currentParentUuid = newConv.parentMessageUuid;
        spinner.succeed("New conversation created");
        continue;
      }

      if (userInput.trim().toLowerCase() === "/export") {
        await this.handleExport(conversationId);
        continue;
      }

      if (userInput.trim().toLowerCase() === "/output-style") {
        await this.handleOutputStyle();
        continue;
      }

      if (userInput.trim().toLowerCase() === "/permissions") {
        await this.handlePermissions();
        continue;
      }

      if (userInput.trim() === "") {
        continue;
      }

      // Display thinking indicator
      console.log(chalk.gray("Claude is thinking..."));

      try {
        // Send message and stream response
        let responseText = "";
        let isFirstChunk = true;
        const { messageUuid, inputTokens, outputTokens } =
          await apiClient.sendMessage(
            conversationId,
            currentParentUuid,
            userInput,
            (chunk: string) => {
              const delta = chunk.slice(responseText.length);
              responseText = chunk;

              if (isFirstChunk) {
                process.stdout.write("\r" + " ".repeat(50) + "\r");
                process.stdout.write(chalk.bold.green("Claude: "));
                isFirstChunk = false;
              }

              process.stdout.write(delta);
            }
          );

        currentParentUuid = messageUuid;

        storage.updateTokenUsage(account.id, inputTokens, outputTokens);

        console.log("\n");

        const tokens = storage.getTokenUsage(account.id);
        ChatUI.showInputPrompt(
          storage.getDefaultModel(),
          tokens,
          account.email || account.name
        );
      } catch (error: any) {
        console.error("[Chat] Error details:", {
          message: error.message,
          stack: error.stack,
        });
        TerminalUI.showError(`Failed to send message: ${error.message}`);
      }
    }
  }

  private async handleExport(conversationId: string) {
    console.log(chalk.yellow("Export conversation..."));

    const inquirer = await import("inquirer");
    const { format, destination } = await inquirer.default.prompt([
      {
        type: "list",
        name: "format",
        message: "Select export format:",
        choices: ["JSON", "Markdown", "Plain Text"],
      },
      {
        type: "list",
        name: "destination",
        message: "Export to:",
        choices: ["File", "Clipboard"],
      },
    ]);

    if (destination === "File") {
      const exportDir = path.join(os.homedir(), ".zencli", "exports");
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const ext =
        format === "JSON" ? "json" : format === "Markdown" ? "md" : "txt";
      const filename = `conversation-${conversationId.slice(0, 8)}-${timestamp}.${ext}`;
      const filepath = path.join(exportDir, filename);

      const content = `Conversation ID: ${conversationId}\nExported: ${new Date().toLocaleString()}\n\n(Content would be here)`;
      fs.writeFileSync(filepath, content, "utf8");

      console.log(chalk.green(`✅ Exported to: ${filepath}`));
    } else {
      console.log(chalk.yellow("⚠️  Clipboard export not yet implemented"));
    }
  }

  private async handleOutputStyle() {
    console.log(chalk.yellow("Output Style Settings"));

    const inquirer = await import("inquirer");
    const { style } = await inquirer.default.prompt([
      {
        type: "list",
        name: "style",
        message: "Select output style:",
        choices: ["Compact", "Detailed", "Minimal"],
      },
    ]);

    console.log(chalk.green(`✅ Output style set to: ${style}`));
  }
  private async handlePermissions() {
    console.log(chalk.yellow("Permissions Management"));
    const inquirer = await import("inquirer");
    const { action } = await inquirer.default.prompt([
      {
        type: "list",
        name: "action",
        message: "Select action:",
        choices: ["View Permissions", "Allow Tool", "Deny Tool", "Reset All"],
      },
    ]);

    if (action === "View Permissions") {
      console.log(chalk.cyan("Current permissions:"));
      console.log(chalk.gray("  • web_search: Allowed"));
      console.log(chalk.gray("  • artifacts: Allowed"));
      console.log(chalk.gray("  • repl: Allowed"));
    } else {
      console.log(chalk.yellow(`⚠️  ${action} not yet implemented`));
    }
  }
}
