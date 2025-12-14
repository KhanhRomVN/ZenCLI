import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";

export class CLIOutput {
  static welcome() {
    console.clear();

    // Big ASCII art
    console.log(
      chalk.blue(
        figlet.textSync("ZenCLI", {
          font: "Standard",
          horizontalLayout: "default",
          verticalLayout: "default",
        })
      )
    );

    const gradientText = gradient(["#00ffff", "#ff00ff", "#ffff00"])(
      "✨ Claude AI Command Line Interface"
    );
    console.log(gradientText);
    console.log(chalk.gray("─".repeat(60)));
    console.log();
  }

  static success(message: string) {
    console.log(chalk.green(`✅ ${message}`));
  }

  static error(message: string) {
    console.log(chalk.red(`❌ ${message}`));
  }

  static warning(message: string) {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  static info(message: string) {
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  static section(title: string) {
    console.log();
    console.log(chalk.bold.cyan(`📌 ${title}`));
    console.log(chalk.gray("─".repeat(40)));
  }

  static list(items: string[], numbered = false) {
    items.forEach((item, index) => {
      if (numbered) {
        console.log(chalk.cyan(`${index + 1}. `) + chalk.white(item));
      } else {
        console.log(chalk.white(`• ${item}`));
      }
    });
  }

  static table(
    headers: string[],
    rows: string[][],
    columnWidths: number[] = []
  ) {
    // Calculate column widths if not provided
    if (columnWidths.length === 0) {
      columnWidths = headers.map((header, index) => {
        const maxContentWidth = Math.max(
          header.length,
          ...rows.map((row) => row[index]?.length || 0)
        );
        return Math.min(maxContentWidth + 2, 50);
      });
    }

    // Print headers
    const headerRow = headers
      .map((header, index) =>
        chalk.bold.cyan(header.padEnd(columnWidths[index]))
      )
      .join(" │ ");
    console.log(headerRow);
    console.log(chalk.gray("─".repeat(headerRow.length)));

    // Print rows
    rows.forEach((row) => {
      const rowText = row
        .map((cell, index) => chalk.white(cell.padEnd(columnWidths[index])))
        .join(" │ ");
      console.log(rowText);
    });
  }

  static progress(message: string) {
    const spinner = ora({
      text: chalk.yellow(message),
      spinner: "dots",
      color: "yellow",
    }).start();

    return {
      succeed: (text?: string) => spinner.succeed(chalk.green(text || message)),
      fail: (text?: string) => spinner.fail(chalk.red(text || message)),
      stop: () => spinner.stop(),
      text: (text: string) => (spinner.text = chalk.yellow(text)),
    };
  }

  static divider(length = 60) {
    console.log(chalk.gray("─".repeat(length)));
  }

  static box(content: string, title?: string) {
    const lines = content.split("\n");
    const maxLength = Math.max(
      ...lines.map((line) => line.length),
      title ? title.length + 4 : 0
    );

    console.log();
    if (title) {
      console.log(
        chalk.cyan(`┌─ ${title} ${"─".repeat(maxLength - title.length - 1)}┐`)
      );
    } else {
      console.log(chalk.cyan(`┌${"─".repeat(maxLength + 2)}┐`));
    }

    lines.forEach((line) => {
      console.log(chalk.cyan(`│ `) + line.padEnd(maxLength) + chalk.cyan(` │`));
    });

    console.log(chalk.cyan(`└${"─".repeat(maxLength + 2)}┘`));
    console.log();
  }

  static keyValue(key: string, value: string) {
    console.log(chalk.cyan(`${key.padEnd(20)}: `) + chalk.white(value));
  }

  static command(description: string, command: string) {
    console.log(chalk.gray(`  ${description}`));
    console.log(chalk.bold.cyan(`  $ ${command}`));
    console.log();
  }

  static note(message: string) {
    console.log(
      chalk.bgYellow.black(" 📝 NOTE ") + " " + chalk.yellow(message)
    );
  }

  static tip(message: string) {
    console.log(chalk.bgGreen.black(" 💡 TIP ") + " " + chalk.green(message));
  }

  static alert(message: string) {
    console.log(chalk.bgRed.white(" ⚠️  ALERT ") + " " + chalk.red(message));
  }

  static clear() {
    console.clear();
  }

  static waitForAnyKey(message = "Press any key to continue...") {
    console.log(chalk.gray(message));
    return new Promise<void>((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      });
    });
  }

  static async confirm(message: string): Promise<boolean> {
    console.log(chalk.yellow(`${message} (y/n)`));
    return new Promise<boolean>((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", (data) => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        const answer = data.toString().toLowerCase().trim();
        resolve(answer === "y" || answer === "yes");
      });
    });
  }

  static async select(
    message: string,
    options: string[]
  ): Promise<number | null> {
    console.log(chalk.cyan(message));
    options.forEach((option, index) => {
      console.log(chalk.white(`${index + 1}. ${option}`));
    });
    console.log(chalk.gray("Enter number (or 0 to cancel):"));

    return new Promise<number | null>((resolve) => {
      const listener = (data: Buffer) => {
        const input = data.toString().trim();
        const number = parseInt(input);

        process.stdin.removeListener("data", listener);
        process.stdin.setRawMode(false);
        process.stdin.pause();

        if (isNaN(number) || number < 0 || number > options.length) {
          resolve(null);
        } else if (number === 0) {
          resolve(null);
        } else {
          resolve(number - 1);
        }
      };

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", listener);
    });
  }

  static formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  static formatDate(date: Date | number): string {
    const d = typeof date === "number" ? new Date(date) : date;
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  static truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }

  static colorizeByLevel(level: string, message: string): string {
    switch (level.toLowerCase()) {
      case "success":
        return chalk.green(message);
      case "error":
        return chalk.red(message);
      case "warning":
        return chalk.yellow(message);
      case "info":
        return chalk.blue(message);
      case "debug":
        return chalk.gray(message);
      default:
        return message;
    }
  }
}
