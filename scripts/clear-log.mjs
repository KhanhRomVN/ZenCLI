import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const logFile = resolve(__dirname, "..", "log.log");

writeFileSync(logFile, "", "utf-8");