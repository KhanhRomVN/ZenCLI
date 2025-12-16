import { spawn, ChildProcess } from "child_process";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getElectronPath(): string {
  try {
    return require("electron");
  } catch (error) {
    throw new Error(
      "Electron not found. Please reinstall ZenCLI:\n" +
        "  npm install -g zencli\n\n" +
        "Or install Electron manually:\n" +
        "  npm install electron"
    );
  }
}

function getElectronAppPath(): string {
  return path.join(__dirname, "electron-app.cjs");
}

export async function isElectronAvailable(): Promise<boolean> {
  try {
    require("electron");
    return true;
  } catch {
    return false;
  }
}

export async function initializeElectron(): Promise<void> {
  const available = await isElectronAvailable();
  if (!available) {
    throw new Error("Electron not available");
  }
}

export async function spawnElectronAuth(): Promise<{
  success: boolean;
  username?: string;
  userEmail?: string;
  sessionKey?: string;
  orgId?: string;
  cookieString?: string;
  error?: string;
}> {
  return new Promise((resolve, reject) => {
    const electronPath = getElectronPath();
    const appPath = getElectronAppPath();

    console.log("[DEBUG] Spawning Electron:", { electronPath, appPath });

    const child = spawn(
      electronPath,
      [appPath, "--login", "--no-sandbox", "--disable-gpu"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
          DISPLAY: process.env.DISPLAY || ":0",
        },
      }
    );

    let output = "";
    let errorOutput = "";
    let foundResult = false;
    let alreadyResolved = false;
    let timeoutHandle: NodeJS.Timeout | null = null;

    // Cleanup function
    const cleanup = () => {
      console.log("[WRAPPER] Cleaning up...");

      // Remove all event listeners
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      child.removeAllListeners();

      // Clear timeout
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      // Kill child if still running
      if (!child.killed) {
        child.kill();
      }
    };

    const safeResolve = (result: any) => {
      if (alreadyResolved) {
        console.log("[WRAPPER] Already resolved, skipping resolve");
        return;
      }
      alreadyResolved = true;
      foundResult = true;
      console.log("[WRAPPER] Resolving with result");
      cleanup();
      resolve(result);
    };

    const safeReject = (error: Error) => {
      if (alreadyResolved) {
        console.log("[WRAPPER] Already resolved, skipping reject");
        return;
      }
      alreadyResolved = true;
      console.log("[WRAPPER] Rejecting with error:", error.message);
      cleanup();
      reject(error);
    };

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      console.log("[ELECTRON STDOUT]", chunk);
      output += chunk;

      // Try to parse JSON in real-time
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.trim().startsWith("{") && line.trim().endsWith("}")) {
          try {
            const parsed = JSON.parse(line.trim());
            console.log("[WRAPPER] Parsed JSON:", parsed);
            if (parsed.success === true && !foundResult) {
              console.log(
                "[WRAPPER] Found success result, killing child and resolving"
              );
              safeResolve(parsed);
              return;
            }
          } catch (err) {
            // Not valid JSON yet, continue
          }
        }
      }
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      console.error("[ELECTRON STDERR]", chunk);
      errorOutput += chunk;
    });

    child.on("error", (error) => {
      console.error("[ELECTRON ERROR]", error);
      safeReject(new Error(`Failed to spawn electron: ${error.message}`));
    });

    child.on("close", (code) => {
      console.log("[ELECTRON CLOSE]", { code, foundResult, alreadyResolved });

      if (alreadyResolved) {
        console.log(
          "[WRAPPER] Already resolved in stdout handler, ignoring close event"
        );
        return;
      }

      if (output) {
        try {
          const lines = output
            .trim()
            .split("\n")
            .filter((line) => line.trim());

          console.log(
            "[WRAPPER] Parsing output on close, lines:",
            lines.length
          );

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.success === true) {
                console.log("[WRAPPER] Found success in close handler");
                safeResolve(parsed);
                return;
              }
            } catch (err) {
              // Skip invalid lines
            }
          }

          safeReject(new Error(`No valid result found in output`));
        } catch (error) {
          safeReject(new Error(`Failed to parse electron output: ${output}`));
        }
      } else if (errorOutput) {
        safeReject(new Error(`Electron error: ${errorOutput}`));
      } else {
        safeReject(new Error(`Electron exited with code ${code}`));
      }
    });

    // Timeout after 5 minutes
    timeoutHandle = setTimeout(() => {
      console.error("[ELECTRON TIMEOUT]");
      if (!alreadyResolved) {
        safeReject(new Error("Electron auth timeout"));
      }
    }, 300000);
  });
}
