import { Command } from "commander";
import chalk from "chalk";
import gradient from "gradient-string";
import inquirer from "inquirer";
import { CLIUI } from "./ui.js";
import { CLIConfig } from "../types/index.js";
import { ResponseManager } from "../api/response.js";

export function setupCommands(ui: CLIUI): Command {
  const program = new Command();

  program
    .name("zencli")
    .description("Modern CLI for ZenCLI UI Component Library")
    .version("1.0.0", "-v, --version", "Display ZenCLI version");

  program
    .command("start")
    .description("Start ZenCLI interactive mode")
    .action(() => {
      ui.renderAll();
    });

  program
    .command("stats")
    .description("Show current statistics")
    .action(() => {
      ui.renderStats();
    });

  program
    .command("model <model-name>")
    .description("Change AI model")
    .action((modelName: string) => {
      ui.updateConfig({ model: modelName });
      console.log(chalk.green(`✓ Model changed to: ${modelName}`));
    });

  program
    .command("mode <mode-type>")
    .description("Change mode (interactive, auto, debug)")
    .action((modeType: string) => {
      if (["interactive", "auto", "debug"].includes(modeType)) {
        ui.updateConfig({ mode: modeType as any });
        console.log(chalk.green(`✓ Mode changed to: ${modeType}`));
      } else {
        console.log(chalk.red("✗ Invalid mode. Use: interactive, auto, debug"));
      }
    });

  program
    .command("task <task-description>")
    .description("Set a new task")
    .action((taskDescription: string) => {
      ui.updateConfig({ task: taskDescription });
      console.log(chalk.green(`✓ Task set: "${taskDescription}"`));
    });

  program
    .command("config")
    .description("Show current configuration")
    .action(() => {
      const config = {
        model: ui["config"].model,
        provider: ui["config"].provider,
        requests: ui["config"].requestsUsed,
        context: ui["config"].contextUsed,
        folder: ui["config"].currentFolder,
        mode: ui["config"].mode,
      };
      console.log(chalk.cyan(JSON.stringify(config, null, 2)));
    });

  program
    .option("-s, --setting", "Configure ZenCLI settings")
    .action(async (options) => {
      if (options.setting) {
        await showSettings(ui);
      }
    });

  program
    .command("backend")
    .description("Check backend server status")
    .action(async () => {
      const { BackendServer } = await import("../server/index.js");
      const backend = BackendServer.getInstance();
      const responseManager = ResponseManager.getInstance();

      console.log(chalk.cyan("\n🔍 Backend Server Status\n"));
      console.log(chalk.gray("─".repeat(50)));
      console.log(`${chalk.yellow("Port:")} ${chalk.green(backend.getPort())}`);
      console.log(
        `${chalk.yellow("Status:")} ${
          backend.getStatus() ? chalk.green("Running") : chalk.red("Stopped")
        }`
      );
      console.log(chalk.gray("─".repeat(50)));

      // Test connection
      try {
        const response = await fetch(
          `http://localhost:${backend.getPort()}/health`
        );
        const data = await response.json();
        console.log(`${chalk.yellow("Health Check:")} ${chalk.green("✓ OK")}`);
        console.log(
          `${chalk.yellow("Response:")} ${JSON.stringify(data, null, 2)}`
        );
      } catch (error) {
        console.log(
          `${chalk.yellow("Health Check:")} ${chalk.red("✗ Failed")}`
        );
      }
      console.log();
    });

  program
    .command("ask <question>")
    .description("Send a question to backend and get response")
    .action(async (question: string) => {
      const { BackendServer } = await import("../server/index.js");
      const backend = BackendServer.getInstance();
      const responseManager = ResponseManager.getInstance();

      console.log(chalk.cyan("\n💬 Sending request to backend...\n"));
      console.log(`${chalk.yellow("Question:")} ${question}`);
      console.log(chalk.gray("─".repeat(50)));

      try {
        const result = await responseManager.sendRequest(
          question,
          backend.getPort()
        );
        console.log(`${chalk.yellow("User Request:")} ${result.userRequest}`);
        console.log(`${chalk.green("Response:")} ${result.response}`);
      } catch (error) {
        console.log(
          chalk.red(
            `✗ Failed to get response: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
        );
      }
      console.log();
    });

  return program;
}

async function showSettings(ui: CLIUI): Promise<void> {
  console.clear();
  console.log(gradient("cyan", "magenta")("\n⚙️  ZenCLI Settings\n"));

  const currentConfig = ui["config"];

  console.log(chalk.cyan("Current Configuration:"));
  console.log(chalk.gray("─".repeat(50)));
  console.log(`${chalk.yellow("Model:")} ${chalk.green(currentConfig.model)}`);
  console.log(
    `${chalk.yellow("Provider:")} ${chalk.green(currentConfig.provider)}`
  );
  console.log(chalk.gray("─".repeat(50)) + "\n");

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to configure?",
      choices: [
        { name: "Change Model", value: "model" },
        { name: "Change Provider", value: "provider" },
        { name: "View Full Config", value: "view" },
        { name: "Exit", value: "exit" },
      ],
    },
  ]);

  switch (answers.action) {
    case "model":
      await changeModel(ui);
      break;
    case "provider":
      await changeProvider(ui);
      break;
    case "view":
      viewFullConfig(ui);
      break;
    case "exit":
      console.log(chalk.green("\n✓ Settings closed\n"));
      break;
  }
}

async function changeModel(ui: CLIUI): Promise<void> {
  const models = ["gpt-4-turbo", "gpt-4", "claude-3", "gemini-pro", "custom"];

  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "model",
      message: "Select a model:",
      choices: models,
    },
  ]);

  if (answer.model === "custom") {
    const customAnswer = await inquirer.prompt([
      {
        type: "input",
        name: "customModel",
        message: "Enter custom model name:",
      },
    ]);
    ui.updateConfig({ model: customAnswer.customModel });
    console.log(
      chalk.green(`\n✓ Model changed to: ${customAnswer.customModel}\n`)
    );
  } else {
    ui.updateConfig({ model: answer.model });
    console.log(chalk.green(`\n✓ Model changed to: ${answer.model}\n`));
  }
}

async function changeProvider(ui: CLIUI): Promise<void> {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Select a provider:",
      choices: ["LiteLLM", "Gemini"],
    },
  ]);

  ui.updateConfig({ provider: answer.provider });
  console.log(chalk.green(`\n✓ Provider changed to: ${answer.provider}\n`));
}

function viewFullConfig(ui: CLIUI): void {
  const config = {
    model: ui["config"].model,
    provider: ui["config"].provider,
    requests: ui["config"].requestsUsed,
    context: ui["config"].contextUsed,
    folder: ui["config"].currentFolder,
    mode: ui["config"].mode,
  };

  console.log(chalk.cyan("\nFull Configuration:"));
  console.log(chalk.gray("─".repeat(50)));
  console.log(chalk.white(JSON.stringify(config, null, 2)));
  console.log(chalk.gray("─".repeat(50)) + "\n");
}
