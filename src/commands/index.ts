import { Command, Flags } from "@oclif/core";
import { render } from "ink";
import React from "react";
import { MainMenu } from "../components/MainMenu.js";
import { ChatInterface } from "../components/ChatInterface.js";
import { AccountManager } from "../components/AccountManager.js";
import { SettingsManager } from "../components/SettingsManager.js";
import { HelpScreen } from "../components/HelpScreen.js";
import { storage } from "../lib/storage.js";
import { authManager } from "../lib/auth-manager.js";
import chalk from "chalk";

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
      this.showAccountManagement();
    } else if (flags.chat) {
      this.showChat();
    } else {
      this.showMainMenu();
    }
  }

  private showMainMenu() {
    const { waitUntilExit } = render(
      React.createElement(() => {
        const handleSelect = async (option: string) => {
          switch (option) {
            case "chat":
              this.showChat();
              break;
            case "add-account":
              await this.addAccount();
              this.showMainMenu();
              break;
            case "manage-accounts":
              this.showAccountManagement();
              break;
            case "settings":
              this.showSettings();
              break;
            case "help":
              this.showHelp();
              break;
          }
        };

        const handleExit = () => {
          console.log(chalk.green("👋 Goodbye!"));
          process.exit(0);
        };

        return React.createElement(MainMenu, {
          onSelect: handleSelect,
          onExit: handleExit,
        });
      })
    );

    waitUntilExit();
  }

  private showChat() {
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
          this.showMainMenu();
        };

        return React.createElement(ChatInterface, { onExit: handleExit });
      })
    );

    waitUntilExit();
  }

  private showAccountManagement() {
    const { waitUntilExit } = render(
      React.createElement(() => {
        const handleBack = () => {
          this.showMainMenu();
        };

        return React.createElement(AccountManager, { onBack: handleBack });
      })
    );

    waitUntilExit();
  }

  private showSettings() {
    const { waitUntilExit } = render(
      React.createElement(() => {
        const handleBack = () => {
          this.showMainMenu();
        };

        return React.createElement(SettingsManager, { onBack: handleBack });
      })
    );

    waitUntilExit();
  }

  private showHelp() {
    const { waitUntilExit } = render(
      React.createElement(() => {
        const handleBack = () => {
          this.showMainMenu();
        };

        return React.createElement(HelpScreen, { onBack: handleBack });
      })
    );

    waitUntilExit();
  }

  private async addAccount() {
    try {
      console.clear();
      console.log(chalk.blue("🔐 Adding new account..."));
      await authManager.login();
      console.log(chalk.green("✅ Account added successfully!"));
    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to add account: ${error.message}`));
    }
  }

  private async showLogs() {
    const { logger } = await import("../lib/logger.js");
    console.clear();
    console.log(chalk.bold.blue("📋 LOGS INFORMATION"));
    console.log();
    console.log(chalk.cyan("Log directory:"));
    console.log(chalk.bold.white(`  ${logger.getLogPath()}`));
    console.log();
    console.log(chalk.gray("To view logs, run:"));
    console.log(chalk.white(`  tail -f ${logger.getLogPath()}/zencli-*.log`));
    console.log();
  }
}
