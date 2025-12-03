import chalk from "chalk";
import gradient from "gradient-string";
import boxen from "boxen";
import Table from "cli-table3";
import ora from "ora";
import { CLIConfig, Shortcut } from "../types/index.js";

export class CLIUI {
  private config: CLIConfig;
  private shortcuts: Shortcut[];

  constructor(config: CLIConfig) {
    this.config = config;
    this.shortcuts = [];
  }

  private getTerminalHeight(): number {
    return process.stdout.rows || 24;
  }

  private moveCursorToBottom(linesFromBottom: number = 0): void {
    const height = this.getTerminalHeight();
    process.stdout.write(`\x1b[${height - linesFromBottom};0H`);
  }

  public renderHeader(): void {
    const zenGradient = gradient("cyan", "magenta", "blue");
    const title =
      zenGradient.multiline(`███████╗███████╗███╗   ██╗ ██████╗██╗     ██╗
╚══███╔╝██╔════╝████╗  ██║██╔════╝██║     ██║
  ███╔╝ █████╗  ██╔██╗ ██║██║     ██║     ██║
 ███╔╝  ██╔══╝  ██║╚██╗██║██║     ██║     ██║
███████╗███████╗██║ ╚████║╚██████╗███████╗██║
╚══════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝`);

    console.log(title);
  }

  public renderStats(): void {
    // Compact horizontal display
    const stats = [
      `${chalk.cyan("Model:")} ${chalk.green(this.config.model)}`,
      `${chalk.cyan("Provider:")} ${chalk.green(this.config.provider)}`,
      `${chalk.cyan("Requests:")} ${chalk.yellow(this.config.requestsUsed)}`,
      `${chalk.cyan("Context:")} ${chalk.yellow(this.config.contextUsed)}`,
      `${chalk.cyan("Mode:")} ${chalk.magenta(this.config.mode)}`,
    ];

    const folderPath =
      this.config.currentFolder.length > 50
        ? "..." + this.config.currentFolder.slice(-47)
        : this.config.currentFolder;

    console.log(
      boxen(
        stats.join(chalk.gray(" │ ")) +
          "\n" +
          chalk.cyan("Folder: ") +
          chalk.blue(folderPath),
        {
          padding: { top: 0, bottom: 0, left: 1, right: 1 },
          margin: { top: 0, bottom: 0 },
          borderStyle: "round",
          borderColor: "cyan",
        }
      )
    );
  }

  public async showSpinner(text: string): Promise<() => void> {
    const spinner = ora({
      text: chalk.cyan(text),
      spinner: "dots",
      color: "cyan",
    }).start();

    return () => spinner.stop();
  }

  public updateConfig(newConfig: Partial<CLIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public clearScreen(): void {
    console.clear();
  }

  public renderAll(): void {
    this.clearScreen();
    this.renderHeader();
    this.renderStats();
  }
}
