#!/usr/bin/env node

async function main() {
  const oclif = require("@oclif/core");

  // Get command line arguments
  const args = process.argv.slice(2);

  // Check if we should run the index command
  // Run index only if: no args OR args start with "-" (flags only)
  const shouldRunIndex =
    args.length === 0 || (args.length > 0 && args[0].startsWith("-"));

  if (shouldRunIndex) {
    // Load the Index command directly
    try {
      const path = require("path");
      const IndexCommand = require(
        path.join(__dirname, "..", "lib", "commands", "index.js")
      );

      // Run the Index command
      const command = new IndexCommand.default(args, await oclif.Config.load());
      await command.run();
      await oclif.flush();
    } catch (error) {
      await oclif.handle(error);
    }
  } else {
    // Run oclif normally for all other commands (auth, chat, account, etc.)
    await oclif.run();
    await oclif.flush();
  }
}

main().catch(require("@oclif/core/handle"));
