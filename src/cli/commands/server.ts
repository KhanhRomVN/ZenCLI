import { Command, Flags } from "@oclif/core";
import { startServer } from "../../server/index.js";
import { logger } from "../../core/lib/logger.js";
import chalk from "chalk";

export default class Server extends Command {
  static description = "Start ZenCLI local HTTP server";

  static examples = [
    "zencli server",
    "zencli server --port 8080",
    "zencli server -p 3001",
  ];

  static flags = {
    port: Flags.integer({
      char: "p",
      description: "Port to run server on",
      default: 3000,
    }),
    help: Flags.help({ char: "h" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Server);

    try {
      console.log(chalk.blue("🚀 Starting ZenCLI Server..."));
      console.log(chalk.gray(`Port: ${flags.port}`));
      console.log();

      await startServer(flags.port);
    } catch (error: any) {
      logger.error(
        "Server startup failed",
        { error: error.message },
        "ServerCommand"
      );
      console.error(chalk.red(`❌ Failed to start server: ${error.message}`));
      process.exit(1);
    }
  }
}
