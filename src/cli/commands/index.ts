import { Command, Flags } from "@oclif/core";
import { render } from "ink";
import React from "react";
import { MainMenu } from "../components/MainMenu.js";
import { ChatInterface } from "../components/ChatInterface.js";
import { AccountManager } from "../components/AccountManager.js";
import { SettingsManager } from "../components/SettingsManager.js";
import { HelpScreen } from "../components/HelpScreen.js";
import { storage } from "../../core/lib/storage.js";
import { authManager } from "../../core/lib/auth-manager.js";
import chalk from "chalk";
import { logger } from "../../core/lib/logger.js";

export default class Index extends Command {
  static description = "ZenCLI - Interactive Terminal UI for Claude AI";
  static strict = false;
  static hidden = false;

  static examples = [
    "zencli                    # Start main menu (TUI)",
    "zencli --login            # Quick login",
    "zencli --chat             # Start chat directly",
    "zencli --account          # Account management",
    "zencli --logs             # Show logs path",
    "zencli --start-server     # Start local HTTP server (keep terminal open)",
  ];

  static flags = {
    login: Flags.boolean({
      char: "l",
      description: "Quick login - add new account",
    }),
    account: Flags.boolean({
      char: "a",
      description: "Go directly to account management",
    }),
    chat: Flags.boolean({
      char: "c",
      description: "Start chat immediately",
    }),
    logs: Flags.boolean({
      description: "Show log directory path",
    }),
    "start-server": Flags.boolean({
      description: "Start local HTTP server (terminal must stay open)",
    }),
    help: Flags.boolean({ char: "h", description: "Show interactive help" }),
    menu: Flags.boolean({
      char: "m",
      description: "Open main menu",
    }),
    version: Flags.version({ char: "v" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Index);

    // Show interactive help
    const args = process.argv.slice(2);
    if (flags.help || args.includes("--help") || args.includes("-h")) {
      this.showHelp();
      return;
    }

    // Start server
    if (flags["start-server"]) {
      await this.startServerMode();
      return;
    }

    // Quick login
    if (flags.login) {
      await this.quickLogin();
      return;
    }

    // Show logs
    if (flags.logs) {
      await this.showLogs();
      return;
    }

    // Direct to account management
    if (flags.account) {
      this.showAccountManagement();
      return;
    }

    // Explicitly show main menu
    if (flags.menu) {
      this.showMainMenu();
      return;
    }

    // Default: Start chat directly
    this.showChat();
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
      logger.error("No active account found when starting chat");
      console.clear();
      console.log(chalk.red("❌ No active account found!"));
      console.log(chalk.cyan("\nTo add an account, run:"));
      console.log(chalk.bold.cyan("  zencli --login"));
      console.log(chalk.gray("or"));
      console.log(chalk.bold.cyan("  zencli"));
      console.log(chalk.gray("  then select 'Add Account' from menu"));
      console.log();
      process.exit(1);
    }

    logger.info("Starting chat interface", { accountName: account.name });

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
      console.log(chalk.gray("A browser window will open for authentication."));
      console.log();
      console.log(chalk.yellow("⏱️  Please complete login within 5 minutes"));
      console.log();

      await authManager.login();

      console.clear();
      console.log(chalk.green("✅ Account added successfully!"));

      const account = storage.getActiveAccount();
      if (account) {
        console.log();
        console.log(chalk.cyan(`👤 Name: ${account.name}`));
        if (account.email) {
          console.log(chalk.cyan(`📧 Email: ${account.email}`));
        }
        console.log(chalk.cyan(`🔑 Account ID: ${account.id.slice(0, 8)}...`));
      }

      console.log();
      console.log(chalk.gray("Press any key to continue..."));

      await new Promise((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once("data", () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve(null);
        });
      });
    } catch (error: any) {
      console.clear();
      console.log(chalk.red(`❌ Failed to add account: ${error.message}`));
      console.log();
      console.log(chalk.yellow("💡 Tips:"));
      console.log(chalk.gray("1. Make sure Chrome/Chromium is installed"));
      console.log(chalk.gray("2. Check your internet connection"));
      console.log(chalk.gray("3. Complete login within 5 minutes"));
      console.log();
      console.log(chalk.gray("Press any key to continue..."));

      await new Promise((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once("data", () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve(null);
        });
      });
    }
  }

  private async quickLogin() {
    const accounts = storage.getAccounts();

    if (accounts.length > 0) {
      console.clear();
      console.log(chalk.yellow("⚠️  You already have accounts:"));
      console.log();
      accounts.forEach((acc, index) => {
        console.log(chalk.cyan(`  ${index + 1}. ${acc.name}`));
        if (acc.email) {
          console.log(chalk.gray(`     ${acc.email}`));
        }
      });
      console.log();
      console.log(chalk.cyan("Do you want to add another account? (y/n)"));

      const answer = await new Promise<string>((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once("data", (data) => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve(data.toString().toLowerCase());
        });
      });

      if (answer !== "y") {
        console.log(chalk.green("Cancelled."));
        return;
      }
    }

    await this.addAccount();
  }

  private async showLogs() {
    const { logger } = await import("../../core/lib/logger.js");
    console.clear();
    console.log(chalk.bold.blue("📋 LOGS INFORMATION"));
    console.log();
    console.log(chalk.cyan("Log directory:"));
    console.log(chalk.bold.white(`  ${logger.getLogPath()}`));
    console.log();
    console.log(chalk.gray("To view logs, run:"));
    console.log(chalk.white(`  tail -f ${logger.getLogPath()}/zencli-*.log`));
    console.log();
    console.log(chalk.gray("Available log files:"));

    const fs = await import("fs");
    const path = await import("path");

    try {
      const files = fs
        .readdirSync(logger.getLogPath())
        .filter((f) => f.startsWith("zencli-") && f.endsWith(".log"))
        .sort()
        .reverse()
        .slice(0, 5);

      if (files.length > 0) {
        files.forEach((file) => {
          const filePath = path.join(logger.getLogPath(), file);
          const stats = fs.statSync(filePath);
          const size = (stats.size / 1024).toFixed(2);
          console.log(chalk.gray(`  • ${file} (${size} KB)`));
        });
      } else {
        console.log(chalk.gray("  No log files found"));
      }
    } catch (error) {
      console.log(chalk.gray("  Unable to read log directory"));
    }

    console.log();
  }

  private async startServerMode() {
    console.clear();
    console.log(chalk.bold.blue("🚀 ZENCLI LOCAL SERVER"));
    console.log(chalk.gray("─".repeat(60)));
    console.log();
    console.log(chalk.yellow("⚠️  IMPORTANT:"));
    console.log(chalk.white("   • Keep this terminal window open"));
    console.log(
      chalk.white("   • Server will stop if you close this terminal")
    );
    console.log(chalk.white("   • Press Ctrl+C to stop the server"));
    console.log();
    console.log(chalk.cyan("📡 Starting HTTP server..."));
    console.log();

    try {
      const { startServer } = await import("../../server/index.js");

      // Setup graceful shutdown
      const shutdown = () => {
        console.log();
        console.log(chalk.yellow("\n⏳ Shutting down server..."));
        logger.info("Server shutdown initiated", {}, "ServerCommand");
        console.log(chalk.green("✅ Server stopped successfully"));
        process.exit(0);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);

      // Start server (this will block)
      await startServer();

      // Keep process alive
      await new Promise(() => {});
    } catch (error: any) {
      console.log();
      console.log(chalk.red(`❌ Failed to start server: ${error.message}`));
      console.log();
      console.log(chalk.yellow("💡 Troubleshooting:"));
      console.log(chalk.gray("   • Check if port 3000 is already in use"));
      console.log(
        chalk.gray("   • Try closing other applications using that port")
      );
      console.log(chalk.gray("   • Check firewall settings"));
      console.log();
      logger.error(
        "Server startup failed",
        { error: error.message },
        "ServerCommand"
      );
      process.exit(1);
    }
  }
}
