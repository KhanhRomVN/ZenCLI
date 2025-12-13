import { Command } from "@oclif/core";
import { storage } from "../lib/storage";
import { getApiClient } from "../lib/api-client";
import { TerminalUI } from "../lib/terminal-ui";
import chalk from "chalk";
import * as readline from "readline";

export default class Chat extends Command {
  static description = "Start interactive chat with Claude";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  async run(): Promise<void> {
    console.clear();

    const account = storage.getActiveAccount();
    if (!account) {
      TerminalUI.showError(
        "No active account. Please login first with: zencli auth login"
      );
      process.exit(1);
    }

    // Display chat header
    console.log(chalk.bold.magenta("💬 CHAT WITH CLAUDE"));
    console.log(chalk.gray(`Account: ${account.name}`));
    console.log(chalk.gray(`Model: ${storage.getDefaultModel()}`));
    console.log(chalk.gray("─".repeat(50)));
    console.log();

    const apiClient = getApiClient();

    // Create new conversation
    const spinner = TerminalUI.showLoading("Creating conversation...");
    try {
      const { conversationId, parentMessageUuid } =
        await apiClient.createConversation(storage.getDefaultModel());
      spinner.succeed("Conversation created");

      console.log(
        chalk.gray('Type your message and press Enter. Type "/exit" to quit.')
      );
      console.log(chalk.gray("─".repeat(50)));
      console.log();

      await this.chatLoop(apiClient, conversationId, parentMessageUuid);
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
    parentMessageUuid: string
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

    while (true) {
      // Get user input
      const userInput = await question(chalk.bold.cyan("You: "));

      if (userInput.trim().toLowerCase() === "/exit") {
        console.log(chalk.green("👋 Goodbye!"));
        rl.close();
        break;
      }

      if (userInput.trim().toLowerCase() === "/clear") {
        console.clear();
        console.log(chalk.bold.magenta("💬 CHAT WITH CLAUDE"));
        console.log(chalk.gray(`Account: ${storage.getActiveAccount()?.name}`));
        console.log(chalk.gray(`Model: ${storage.getDefaultModel()}`));
        console.log(chalk.gray("─".repeat(50)));
        console.log();
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

      if (userInput.trim() === "") {
        continue;
      }

      // Display thinking indicator
      console.log(chalk.gray("Claude is thinking..."));

      try {
        // Send message and stream response
        let responseText = "";
        let isFirstChunk = true;
        const { messageUuid } = await apiClient.sendMessage(
          conversationId,
          currentParentUuid,
          userInput,
          (chunk: string) => {
            // Calculate delta (only new text)
            const delta = chunk.slice(responseText.length);
            responseText = chunk;

            // Clear the "thinking" line on first chunk
            if (isFirstChunk) {
              process.stdout.write("\r" + " ".repeat(50) + "\r");
              process.stdout.write(chalk.bold.green("Claude: "));
              isFirstChunk = false;
            }

            // Write only the new text (delta)
            process.stdout.write(delta);
          }
        );

        currentParentUuid = messageUuid;
        console.log("\n");
      } catch (error: any) {
        console.error("[Chat] Error details:", {
          message: error.message,
          stack: error.stack,
        });
        TerminalUI.showError(`Failed to send message: ${error.message}`);
      }
    }
  }
}
