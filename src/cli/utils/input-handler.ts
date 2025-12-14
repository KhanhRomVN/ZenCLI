import readline from "readline";
import chalk from "chalk";

export class InputHandler {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.cyan(prompt + " "), (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async password(prompt: string, mask = "*"): Promise<string> {
    return new Promise((resolve) => {
      let input = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      process.stdout.write(chalk.cyan(prompt + " "));

      const listener = (char: string) => {
        switch (char) {
          case "\n":
          case "\r":
          case "\u0004":
            // Enter or Ctrl+D
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write("\n");
            process.stdin.removeListener("data", listener as any);
            resolve(input);
            break;
          case "\u0003":
            // Ctrl+C
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write("\n");
            process.stdin.removeListener("data", listener as any);
            process.exit(0);
            break;
          case "\u0008":
          case "\u007f":
            // Backspace or Delete
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.write("\b \b");
            }
            break;
          default:
            // Regular character
            if (char && char.length === 1) {
              input += char;
              process.stdout.write(mask);
            }
            break;
        }
      };

      process.stdin.on("data", listener);
    });
  }

  async select<T>(
    prompt: string,
    options: { label: string; value: T }[],
    defaultValue?: T
  ): Promise<T> {
    let selectedIndex = defaultValue
      ? options.findIndex((opt) => opt.value === defaultValue)
      : 0;

    // Hide cursor
    process.stdout.write("\x1B[?25l");

    const render = () => {
      console.clear();
      console.log(chalk.cyan(prompt));
      console.log(chalk.gray("Use ↑↓ arrows to select, Enter to confirm"));
      console.log();

      options.forEach((option, index) => {
        if (index === selectedIndex) {
          console.log(chalk.green(`→ ${option.label}`));
        } else {
          console.log(chalk.white(`  ${option.label}`));
        }
      });
    };

    render();

    return new Promise((resolve) => {
      const listener = (char: string, key: any) => {
        if (key.name === "up") {
          selectedIndex =
            selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
          render();
        } else if (key.name === "down") {
          selectedIndex =
            selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
          render();
        } else if (key.name === "return" || char === "\r" || char === "\n") {
          // Show cursor again
          process.stdout.write("\x1B[?25h");
          process.stdin.removeListener("keypress", listener);
          readline.emitKeypressEvents(process.stdin);
          process.stdin.setRawMode(false);
          console.clear();
          resolve(options[selectedIndex].value);
        } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
          // Show cursor again
          process.stdout.write("\x1B[?25h");
          process.stdin.removeListener("keypress", listener);
          readline.emitKeypressEvents(process.stdin);
          process.stdin.setRawMode(false);
          console.clear();
          process.exit(0);
        }
      };

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("keypress", listener);
    });
  }

  async confirm(prompt: string, defaultValue = true): Promise<boolean> {
    const options = [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ];

    return this.select(prompt, options, defaultValue);
  }

  async multiSelect<T>(
    prompt: string,
    options: { label: string; value: T; selected?: boolean }[]
  ): Promise<T[]> {
    let selectedIndices = options
      .map((opt, index) => (opt.selected ? index : -1))
      .filter((index) => index !== -1);

    // Hide cursor
    process.stdout.write("\x1B[?25l");

    const render = () => {
      console.clear();
      console.log(chalk.cyan(prompt));
      console.log(
        chalk.gray(
          "Use ↑↓ arrows to navigate, Space to select, Enter to confirm"
        )
      );
      console.log();

      options.forEach((option, index) => {
        const isSelected = selectedIndices.includes(index);
        const isFocused =
          index === selectedIndices[selectedIndices.length - 1] ||
          (selectedIndices.length === 0 && index === 0);

        if (isFocused) {
          console.log(
            chalk.green(`→ ${isSelected ? "[✓]" : "[ ]"} ${option.label}`)
          );
        } else {
          console.log(
            chalk.white(`  ${isSelected ? "[✓]" : "[ ]"} ${option.label}`)
          );
        }
      });

      if (selectedIndices.length > 0) {
        console.log();
        console.log(chalk.gray(`Selected: ${selectedIndices.length} item(s)`));
      }
    };

    render();

    return new Promise((resolve) => {
      let currentIndex =
        selectedIndices.length > 0
          ? selectedIndices[selectedIndices.length - 1]
          : 0;

      const listener = (char: string, key: any) => {
        if (key.name === "up") {
          currentIndex =
            currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          render();
        } else if (key.name === "down") {
          currentIndex =
            currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          render();
        } else if (char === " ") {
          // Toggle selection
          const index = selectedIndices.indexOf(currentIndex);
          if (index === -1) {
            selectedIndices.push(currentIndex);
          } else {
            selectedIndices.splice(index, 1);
          }
          render();
        } else if (key.name === "return" || char === "\r" || char === "\n") {
          // Show cursor again
          process.stdout.write("\x1B[?25h");
          process.stdin.removeListener("keypress", listener);
          readline.emitKeypressEvents(process.stdin);
          process.stdin.setRawMode(false);
          console.clear();
          const selectedValues = selectedIndices.map(
            (index) => options[index].value
          );
          resolve(selectedValues);
        } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
          // Show cursor again
          process.stdout.write("\x1B[?25h");
          process.stdin.removeListener("keypress", listener);
          readline.emitKeypressEvents(process.stdin);
          process.stdin.setRawMode(false);
          console.clear();
          process.exit(0);
        }
      };

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("keypress", listener);
    });
  }

  async autocomplete(
    prompt: string,
    suggestions: string[],
    defaultValue = ""
  ): Promise<string> {
    let input = defaultValue;
    let suggestionIndex = -1;
    let filteredSuggestions: string[] = [];

    const filterSuggestions = () => {
      if (!input) {
        filteredSuggestions = [];
      } else {
        filteredSuggestions = suggestions.filter((s) =>
          s.toLowerCase().includes(input.toLowerCase())
        );
      }
      suggestionIndex = filteredSuggestions.length > 0 ? 0 : -1;
    };

    // Hide cursor
    process.stdout.write("\x1B[?25l");

    const render = () => {
      console.clear();
      console.log(chalk.cyan(prompt));
      console.log(
        chalk.gray(
          "Type to filter, ↑↓ to navigate suggestions, Tab to autocomplete"
        )
      );
      console.log();

      // Show current input
      console.log(chalk.white("> ") + chalk.green(input));

      // Show suggestions if any
      if (filteredSuggestions.length > 0) {
        console.log();
        console.log(chalk.gray("Suggestions:"));
        filteredSuggestions.forEach((suggestion, index) => {
          if (index === suggestionIndex) {
            console.log(chalk.green(`→ ${suggestion}`));
          } else {
            console.log(chalk.white(`  ${suggestion}`));
          }
        });
      }
    };

    filterSuggestions();
    render();

    return new Promise((resolve) => {
      const listener = (char: string, key: any) => {
        if (key.name === "up") {
          if (filteredSuggestions.length > 0) {
            suggestionIndex =
              suggestionIndex > 0
                ? suggestionIndex - 1
                : filteredSuggestions.length - 1;
            render();
          }
        } else if (key.name === "down") {
          if (filteredSuggestions.length > 0) {
            suggestionIndex =
              suggestionIndex < filteredSuggestions.length - 1
                ? suggestionIndex + 1
                : 0;
            render();
          }
        } else if (key.name === "tab") {
          if (suggestionIndex >= 0 && filteredSuggestions.length > 0) {
            input = filteredSuggestions[suggestionIndex];
            filterSuggestions();
            render();
          }
        } else if (key.name === "return" || char === "\r" || char === "\n") {
          // Show cursor again
          process.stdout.write("\x1B[?25h");
          process.stdin.removeListener("keypress", listener);
          readline.emitKeypressEvents(process.stdin);
          process.stdin.setRawMode(false);
          console.clear();
          resolve(input);
        } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
          // Show cursor again
          process.stdout.write("\x1B[?25h");
          process.stdin.removeListener("keypress", listener);
          readline.emitKeypressEvents(process.stdin);
          process.stdin.setRawMode(false);
          console.clear();
          process.exit(0);
        } else if (key.name === "backspace") {
          if (input.length > 0) {
            input = input.slice(0, -1);
            filterSuggestions();
            render();
          }
        } else if (char && char.length === 1 && !key.ctrl) {
          // Regular character input
          input += char;
          filterSuggestions();
          render();
        }
      };

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("keypress", listener);
    });
  }

  async promptWithValidation(
    prompt: string,
    validator: (input: string) => string | true,
    defaultValue = ""
  ): Promise<string> {
    while (true) {
      const input = await this.question(prompt);
      const value = input || defaultValue;
      const validationResult = validator(value);

      if (validationResult === true) {
        return value;
      } else {
        console.log(chalk.red(`Error: ${validationResult}`));
        console.log(chalk.gray("Please try again."));
        console.log();
      }
    }
  }

  close() {
    this.rl.close();
  }

  static async waitForAnyKey(message = "Press any key to continue...") {
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

  static createSpinner(message: string) {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;
    let interval: NodeJS.Timeout;

    const start = () => {
      process.stdout.write("\x1B[?25l"); // Hide cursor
      interval = setInterval(() => {
        process.stdout.write(`\r${chalk.yellow(frames[i])} ${message}`);
        i = (i + 1) % frames.length;
      }, 80);
    };

    const stop = (success = true, finalMessage?: string) => {
      clearInterval(interval);
      process.stdout.write("\r");
      if (finalMessage) {
        console.log(
          success
            ? chalk.green(`✅ ${finalMessage}`)
            : chalk.red(`❌ ${finalMessage}`)
        );
      }
      process.stdout.write("\x1B[?25h"); // Show cursor
    };

    return { start, stop };
  }
}
