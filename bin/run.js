#!/usr/bin/env node

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const oclif = await import("@oclif/core");
  const args = process.argv.slice(2);

  const shouldRunIndex =
    args.length === 0 || (args.length > 0 && args[0].startsWith("-"));

  if (shouldRunIndex) {
    try {
      const { default: IndexCommand } = await import(
        join(__dirname, "..", "lib", "cli", "commands", "index.js")
      );

      const command = new IndexCommand(args, await oclif.Config.load());
      await command.run();
      await oclif.flush();
    } catch (error) {
      await oclif.handle(error);
    }
  } else {
    await oclif.run();
    await oclif.flush();
  }
}

main().catch(async (error) => {
  const { handle } = await import("@oclif/core/handle");
  await handle(error);
});
