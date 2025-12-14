import { Command, Flags, Args } from "@oclif/core";
import { authManager } from "../../../core/lib/auth-manager.js";
import { storage } from "../../../core/lib/storage.js";
import chalk from "chalk";
import { logger } from "../../../core/lib/logger.js";

export default class Auth extends Command {
  static description = "Authentication commands for ZenCLI";

  static examples = [
    "zencli auth login",
    "zencli auth logout",
    "zencli auth status",
  ];

  static flags = {
    help: Flags.help({ char: "h" }),
  };

  static args = {
    command: Args.string({
      description: "Authentication command",
      required: true,
      options: ["login", "logout", "status", "list", "switch"],
    }),
    accountId: Args.string({
      description: "Account ID for switch command",
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Auth);

    switch (args.command) {
      case "login":
        await this.login();
        break;
      case "logout":
        await this.logout();
        break;
      case "status":
        await this.status();
        break;
      case "list":
        await this.listAccounts();
        break;
      case "switch":
        await this.switchAccount(args.accountId);
        break;
      default:
        this.error(`Unknown command: ${args.command}`);
    }
  }

  private async login() {
    try {
      console.log(chalk.blue("🔐 Starting login process..."));
      console.log(chalk.gray("A browser window will open for authentication."));
      console.log();

      await authManager.login();

      const account = storage.getActiveAccount();
      if (account) {
        console.clear();
        console.log(chalk.green("✅ Login successful!"));
        console.log();
        console.log(chalk.cyan(`👤 Name: ${account.name}`));
        if (account.email) {
          console.log(chalk.cyan(`📧 Email: ${account.email}`));
        }
        console.log(chalk.cyan(`🔑 Account ID: ${account.id.slice(0, 8)}...`));
        console.log();
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Login failed: ${error.message}`));
      logger.error("Login failed", { error: error.message }, "AuthCommand");
      process.exit(1);
    }
  }

  private async logout() {
    try {
      const accounts = storage.getAccounts();
      if (accounts.length === 0) {
        console.log(chalk.yellow("⚠️  No accounts to logout from."));
        return;
      }

      console.log(
        chalk.yellow("⚠️  This will remove all accounts. Continue? (y/n)")
      );

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

      await authManager.logout();
      console.log(chalk.green("✅ All accounts removed successfully!"));
    } catch (error: any) {
      console.error(chalk.red(`❌ Logout failed: ${error.message}`));
      logger.error("Logout failed", { error: error.message }, "AuthCommand");
      process.exit(1);
    }
  }

  private async status() {
    const account = storage.getActiveAccount();
    const accounts = storage.getAccounts();

    console.clear();
    console.log(chalk.bold.blue("🔐 AUTHENTICATION STATUS"));
    console.log(chalk.gray("─".repeat(40)));
    console.log();

    if (accounts.length === 0) {
      console.log(chalk.yellow("⚠️  No accounts found."));
      console.log(chalk.cyan("\nTo login, run:"));
      console.log(chalk.bold.cyan("  zencli auth login"));
      console.log(chalk.bold.cyan("  zencli --login"));
      console.log();
      return;
    }

    console.log(chalk.green(`🟢 ${accounts.length} account(s) found`));
    console.log();

    accounts.forEach((acc, index) => {
      const isActive = account?.id === acc.id;
      console.log(
        chalk[isActive ? "green" : "white"](
          `${isActive ? "→ " : "  "}${index + 1}. ${acc.name}`
        )
      );
      if (acc.email) {
        console.log(chalk.gray(`     ${acc.email}`));
      }
      console.log(chalk.gray(`     ID: ${acc.id.slice(0, 8)}...`));
      console.log(
        chalk.gray(`     Added: ${new Date(acc.addedAt).toLocaleString()}`)
      );
      console.log();
    });

    if (account) {
      const usage = storage.getTokenUsage(account.id);
      console.log(chalk.cyan("📊 Token Usage:"));
      console.log(chalk.gray(`     Input: ${usage.input} tokens`));
      console.log(chalk.gray(`     Output: ${usage.output} tokens`));
      console.log(
        chalk.gray(`     Total: ${usage.input + usage.output} tokens`)
      );
      console.log();
    }
  }

  private async listAccounts() {
    const accounts = storage.getAccounts();
    const activeAccount = storage.getActiveAccount();

    if (accounts.length === 0) {
      console.log(chalk.yellow("No accounts found."));
      return;
    }

    console.clear();
    console.log(chalk.bold.blue("👥 ACCOUNTS LIST"));
    console.log(chalk.gray("─".repeat(40)));
    console.log();

    accounts.forEach((acc, index) => {
      const isActive = activeAccount?.id === acc.id;
      console.log(
        chalk[isActive ? "green" : "white"](
          `${isActive ? "🟢 " : "⚪ "}${index + 1}. ${acc.name}`
        )
      );
      if (acc.email) {
        console.log(chalk.gray(`     📧 ${acc.email}`));
      }
      console.log(chalk.gray(`     🔑 ID: ${acc.id.slice(0, 8)}...`));
      console.log(
        chalk.gray(
          `     📅 Added: ${new Date(acc.addedAt).toLocaleDateString()}`
        )
      );
      console.log(
        chalk.gray(
          `     ⏰ Last used: ${new Date(acc.lastUsed).toLocaleString()}`
        )
      );
      console.log();
    });

    console.log(chalk.cyan("Commands:"));
    console.log(
      chalk.gray("  zencli auth switch <accountId>  # Switch to account")
    );
    console.log(
      chalk.gray("  zencli auth login              # Add new account")
    );
    console.log();
  }

  private async switchAccount(accountId?: string) {
    const accounts = storage.getAccounts();

    if (!accountId) {
      // Show selection menu
      console.clear();
      console.log(chalk.bold.blue("🔄 SWITCH ACCOUNT"));
      console.log(chalk.gray("─".repeat(40)));
      console.log();

      if (accounts.length === 0) {
        console.log(chalk.yellow("No accounts found."));
        return;
      }

      accounts.forEach((acc, index) => {
        console.log(chalk.white(`${index + 1}. ${acc.name}`));
        if (acc.email) {
          console.log(chalk.gray(`   ${acc.email}`));
        }
      });

      console.log();
      console.log(
        chalk.cyan("Enter account number (1-" + accounts.length + "):")
      );

      const answer = await new Promise<string>((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once("data", (data) => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve(data.toString().trim());
        });
      });

      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= accounts.length) {
        console.log(chalk.red("❌ Invalid selection."));
        return;
      }

      accountId = accounts[index].id;
    }

    try {
      const success = await storage.setActiveAccount(accountId);
      if (success) {
        const account = storage.getAccount(accountId);
        console.log(chalk.green(`✅ Switched to account: ${account?.name}`));
      } else {
        console.log(chalk.red("❌ Account not found."));
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to switch account: ${error.message}`));
      logger.error(
        "Switch account failed",
        { error: error.message },
        "AuthCommand"
      );
    }
  }
}
