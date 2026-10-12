import { readdir, readFile, writeFile, chmod } from "fs/promises";
import { join } from "path";

const distDir = "./dist";
const cliPath = join(distDir, "cli.js");
const SHEBANG = "#!/usr/bin/env node\n";

async function prepareCliEntry(filePath) {
  try {
    let content = await readFile(filePath, "utf-8");
    
    // Add shebang if missing
    if (!content.startsWith("#!")) {
      content = SHEBANG + content;
      await writeFile(filePath, content, "utf-8");
      console.log(`Added shebang to: ${filePath}`);
    }
    
    // Ensure executable permission
    await chmod(filePath, 0o755);
    console.log(`Set executable permission on: ${filePath}`);
  } catch (err) {
    console.error(`Failed to prepare CLI entry: ${err.message}`);
  }
}

async function processDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      let content = await readFile(fullPath, "utf-8");
      
      // Regex to find relative imports/exports that don't have an extension or .json/.css
      // Matches: from "../path" or from "./path" or import("../path") etc.
      // We look for quotes containing paths starting with ./ or ../ and not ending in .js, .json, .css, .node
      
      const regex = /(from\s+["'])(\.\.?\/[^"']+?)(["'])/g;
      
      const newContent = content.replace(regex, (match, prefix, path, suffix) => {
        // If it already has a known extension, leave it alone
        if (/\.(js|json|css|node)$/.test(path)) {
          return match;
        }
        
        // Check if it's a directory import (index.js) - harder to detect statically without fs check, 
        // but usually explicit files are safer. Let's assume file imports need .js
        // However, if the path resolves to a directory, Node expects index.js
        
        // Simple heuristic: append .js
        return `${prefix}${path}.js${suffix}`;
      });

      // Also handle dynamic imports: import("./path")
      const dynRegex = /import\s*\(\s*["'](\.\.?\/[^"']+?)["']\s*\)/g;
      const finalContent = newContent.replace(dynRegex, (match, path) => {
         if (/\.(js|json|css|node)$/.test(path)) {
          return match;
        }
        return `import("${path}.js")`;
      });

      if (finalContent !== content) {
        await writeFile(fullPath, finalContent, "utf-8");
        console.log(`Fixed ESM imports in: ${fullPath}`);
      }
    }
  }
}

await prepareCliEntry(cliPath);
await processDirectory(distDir);
console.log("ESM import fixes applied.");