import { Command } from "@oclif/core";
import { render } from "ink";
import React from "react";
import { ChatInterface } from "../components/ChatInterface.js";
import { storage } from "../lib/storage.js";
import chalk from "chalk";

export default class Chat extends Command {
  static description = "Start interactive chat with Claude";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  async run(): Promise<void> {
    const account = storage.getActiveAccount();
    if (!account) {
      console.clear();
      console.log(chalk.red("❌ No active account found!"));
      console.log(chalk.cyan("\nTo add an account, run:"));
      console.log(chalk.bold.cyan("  zencli auth login"));
      console.log();
      process.exit(1);
    }

    const { waitUntilExit } = render(
      React.createElement(() => {
        const handleExit = () => {
          console.log(chalk.green("👋 Returning to terminal..."));
          process.exit(0);
        };

        return React.createElement(ChatInterface, { onExit: handleExit });
      })
    );

    waitUntilExit();
  }
}
