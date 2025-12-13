import { Command, Flags } from "@oclif/core";
import { TerminalUI } from "../lib/terminal-ui";
import { storage } from "../lib/storage";
import { authManager } from "../lib/auth-manager";
import chalk from "chalk";

export default class Account extends Command {
  static description = "Manage Claude accounts";

  static flags = {
    list: Flags.boolean({
      char: "l",
      description: "List all accounts",
    }),
    add: Flags.boolean({
      char: "a",
      description: "Add new account",
    }),
    remove: Flags.string({
      char: "r",
      description: "Remove account by ID",
    }),
    switch: Flags.string({
      char: "s",
      description: "Switch to account by ID",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Account);

    if (flags.list) {
      await this.listAccounts();
    } else if (flags.add) {
      await this.addAccount();
    } else if (flags.remove) {
      await this.removeAccount(flags.remove);
    } else if (flags.switch) {
      await this.switchAccount(flags.switch);
    } else {
      await this.interactiveMode();
    }
  }

  private async listAccounts() {
    const accounts = storage.getAccounts();
    const activeAccount = storage.getActiveAccount();

    if (accounts.length === 0) {
      console.log(chalk.yellow("No accounts found."));
      return;
    }

    console.log(chalk.bold.green("📋 ALL ACCOUNTS"));
    console.log();

    accounts.forEach((account, index) => {
      const isActive = activeAccount?.id === account.id;
      const prefix = isActive ? chalk.green("→ ") : "  ";
      const status = isActive ? chalk.bgGreen.black(" ACTIVE ") : "       ";

      console.log(prefix + status + " " + chalk.bold.cyan(account.name));
      if (account.email) {
        console.log("   " + chalk.gray(`Email: ${account.email}`));
      }
      console.log("   " + chalk.gray(`ID: ${account.id.slice(0, 8)}...`));
      console.log(
        "   " + chalk.gray(`Org ID: ${account.orgId.slice(0, 8)}...`)
      );
      console.log(
        "   " +
          chalk.gray(`Added: ${new Date(account.addedAt).toLocaleDateString()}`)
      );
      console.log();
    });
  }

  private async addAccount() {
    try {
      const spinner = TerminalUI.showLoading("Opening browser for login...");
      const account = await authManager.login();
      spinner.succeed(`✅ Added account: ${account.name}`);
    } catch (error: any) {
      TerminalUI.showError(`❌ Failed to add account: ${error.message}`);
    }
  }

  private async removeAccount(idOrIndex: string) {
    const accounts = storage.getAccounts();

    // Try to find by ID first
    let account = accounts.find((acc) => acc.id === idOrIndex);

    // If not found by ID, try by index
    if (!account) {
      const index = parseInt(idOrIndex) - 1;
      if (!isNaN(index) && index >= 0 && index < accounts.length) {
        account = accounts[index];
      }
    }

    if (!account) {
      TerminalUI.showError("Account not found");
      return;
    }

    const confirmed = await TerminalUI.promptConfirm(
      `Remove account "${account.name}"?`
    );

    if (confirmed) {
      storage.removeAccount(account.id);
      TerminalUI.showSuccess(`Removed account: ${account.name}`);
    }
  }

  private async switchAccount(idOrIndex: string) {
    const accounts = storage.getAccounts();

    // Try to find by ID first
    let account = accounts.find((acc) => acc.id === idOrIndex);

    // If not found by ID, try by index
    if (!account) {
      const index = parseInt(idOrIndex) - 1;
      if (!isNaN(index) && index >= 0 && index < accounts.length) {
        account = accounts[index];
      }
    }

    if (!account) {
      TerminalUI.showError("Account not found");
      return;
    }

    storage.setActiveAccount(account.id);
    TerminalUI.showSuccess(`Switched to account: ${account.name}`);
  }

  private async interactiveMode() {
    await TerminalUI.showAccountScreen();

    const inquirer = await import("inquirer");
    const { command } = await inquirer.default.prompt([
      {
        type: "input",
        name: "command",
        message: "Enter command:",
        validate: (input: string) => {
          const validCommands = ["switch", "add", "remove", "back"];
          const cmd = input.split(" ")[0];
          return (
            validCommands.includes(cmd) ||
            input === "" ||
            input.toLowerCase() === "back"
          );
        },
      },
    ]);

    if (!command || command.toLowerCase() === "back") {
      return;
    }

    const [cmd, ...args] = command.split(" ");

    switch (cmd.toLowerCase()) {
      case "switch":
        await this.switchAccount(args[0]);
        break;
      case "add":
        await this.addAccount();
        break;
      case "remove":
        await this.removeAccount(args[0]);
        break;
    }
  }
}
