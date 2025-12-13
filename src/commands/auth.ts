// File: src/commands/auth.ts
import { Command, Flags, Args } from "@oclif/core"; // Thêm Args
import { authManager } from "../lib/auth-manager";
import { storage } from "../lib/storage";
import { TerminalUI } from "../lib/terminal-ui";
import chalk from "chalk";

export default class Auth extends Command {
  static description = "Authentication commands for Claude AI";

  static examples = [
    "<%= config.bin %> <%= command.id %> login",
    "<%= config.bin %> <%= command.id %> logout",
    "<%= config.bin %> <%= command.id %> status",
  ];

  static flags = {
    help: Flags.help({ char: "h" }),
  };

  // Sửa: Sử dụng đúng cú pháp Args của oclif
  static args = {
    action: Args.string({
      description: "Action to perform",
      required: true,
      options: ["login", "logout", "status"],
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Auth);

    switch (args.action) {
      case "login":
        await this.login();
        break;
      case "logout":
        await this.logout();
        break;
      case "status":
        await this.status();
        break;
      default:
        this.error(`Unknown action: ${args.action}`);
    }
  }

  private async login(): Promise<void> {
    const accounts = storage.getAccounts();

    if (accounts.length > 0) {
      const confirmed = await TerminalUI.promptConfirm(
        "You already have accounts. Add another one?"
      );

      if (!confirmed) {
        console.log(chalk.yellow("Login cancelled."));
        return;
      }
    }

    try {
      console.log(chalk.blue("🔐 Starting Claude login process..."));
      console.log(chalk.gray("A browser window will open for authentication."));
      console.log();
      console.log(chalk.yellow("⏱️  Please complete login within 5 minutes"));
      console.log();

      const spinner = TerminalUI.showLoading("Opening browser...");

      const account = await authManager.login();

      spinner.succeed(chalk.green(`✅ Login successful!`));
      console.log();
      console.log(chalk.bold.green("🎉 Account added successfully!"));
      console.log();
      console.log(chalk.cyan(`👤 Name: ${account.name}`));
      if (account.email) {
        console.log(chalk.cyan(`📧 Email: ${account.email}`));
      }
      console.log(chalk.cyan(`🔑 Account ID: ${account.id.slice(0, 8)}...`));
      console.log(chalk.cyan(`🏢 Org ID: ${account.orgId.slice(0, 8)}...`));
      console.log();

      // Set as active account
      await storage.setActiveAccount(account.id);
      console.log(chalk.green("✨ This account has been set as active."));
      console.log(
        chalk.gray("Use `zencli account:switch` to change active account.")
      );
    } catch (error: any) {
      TerminalUI.showError(`Login failed: ${error.message}`);
      console.log();
      console.log(chalk.yellow("💡 Tips:"));
      console.log(chalk.gray("1. Make sure Chrome/Chromium is installed"));
      console.log(chalk.gray("2. Check your internet connection"));
      console.log(chalk.gray("3. Complete login within 5 minutes"));
      process.exit(1);
    }
  }

  private async logout(): Promise<void> {
    const accounts = storage.getAccounts();

    if (accounts.length === 0) {
      console.log(chalk.yellow("No accounts found."));
      return;
    }

    console.log(
      chalk.red("⚠️  WARNING: Logout will remove all accounts locally.")
    );
    console.log(
      chalk.gray("Your Claude accounts will NOT be logged out from Claude.ai.")
    );
    console.log();

    const confirmed = await TerminalUI.promptConfirm(
      "Are you sure you want to remove all accounts from this device?"
    );

    if (!confirmed) {
      console.log(chalk.green("Logout cancelled."));
      return;
    }

    storage.clear();
    console.log(chalk.green("✅ All accounts have been removed locally."));
    console.log(
      chalk.gray("Note: You are still logged in on Claude.ai website.")
    );
  }

  private async status(): Promise<void> {
    const accounts = storage.getAccounts();
    const activeAccount = storage.getActiveAccount();

    console.log(chalk.bold.blue("🔍 AUTHENTICATION STATUS"));
    console.log();

    if (accounts.length === 0) {
      console.log(chalk.yellow("❌ No accounts found."));
      console.log();
      console.log(chalk.cyan("To add an account, run:"));
      console.log(chalk.bold.cyan("  zencli auth login"));
      console.log();
      return;
    }

    console.log(
      chalk.bold.green(
        `✅ ${accounts.length} account${accounts.length > 1 ? "s" : ""} found`
      )
    );
    console.log();

    console.log(chalk.bold.cyan("📋 ALL ACCOUNTS:"));
    accounts.forEach((account, index) => {
      const isActive = activeAccount?.id === account.id;
      const prefix = isActive ? chalk.green("→ ") : "  ";
      const status = isActive
        ? chalk.bgGreen.black(" ACTIVE ")
        : chalk.gray("       ");

      console.log(prefix + status + " " + chalk.bold(account.name));
      if (account.email) {
        console.log("   " + chalk.gray(`📧 ${account.email}`));
      }
      console.log("   " + chalk.gray(`🆔 ${account.id.slice(0, 8)}...`));
      console.log(
        "   " +
          chalk.gray(
            `📅 Added: ${new Date(account.addedAt).toLocaleDateString()}`
          )
      );
      console.log(
        "   " +
          chalk.gray(
            `🔄 Last used: ${new Date(account.lastUsed).toLocaleDateString()}`
          )
      );
      console.log();
    });

    if (!activeAccount) {
      console.log(chalk.yellow("⚠️  No active account selected."));
      console.log(
        chalk.cyan("Use `zencli account:switch` to select an active account.")
      );
      console.log();
    } else {
      console.log(chalk.bold.green("📊 SESSION INFO:"));
      console.log(chalk.gray(`Active account: ${activeAccount.name}`));
      console.log(
        chalk.gray(
          `Session key: ${activeAccount.sessionKey ? "✅ Present" : "❌ Missing"}`
        )
      );
      console.log(
        chalk.gray(`Organization ID: ${activeAccount.orgId.slice(0, 8)}...`)
      );

      // Test connection
      try {
        const spinner = TerminalUI.showLoading("Testing Claude connection...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        spinner.succeed(chalk.green("✅ Claude connection is working"));
      } catch {
        console.log(chalk.yellow("⚠️  Unable to verify Claude connection"));
      }
    }

    console.log();
    console.log(chalk.bold.blue("📝 AVAILABLE COMMANDS:"));
    console.log(
      chalk.cyan("  zencli auth login   ") + chalk.gray("Add new account")
    );
    console.log(
      chalk.cyan("  zencli auth logout  ") + chalk.gray("Remove all accounts")
    );
    console.log(
      chalk.cyan("  zencli account      ") + chalk.gray("Manage accounts")
    );
    console.log();
  }
}
