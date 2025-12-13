#!/usr/bin/env node

import { execute } from "@oclif/core";

async function main() {
  await execute({
    development: false,
    dir: __dirname,
  });
}

main().catch(console.error);
