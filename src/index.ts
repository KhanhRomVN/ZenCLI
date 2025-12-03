#!/usr/bin/env node

import { CLIUI } from "./cli/ui.js";
import { setupCommands } from "./cli/commands.js";
import { generateFakeData } from "./cli/utils.js";
import { BackendServer } from "./server/index.js";
import chalk from "chalk";
import gradient from "gradient-string";

export async function startCLI() {
  try {
    // Khởi động backend server
    const backend = BackendServer.getInstance();
    const serverStatus = await backend.start();

    if (!serverStatus.success) {
      console.error(chalk.red("❌ Failed to initialize backend server"));
      process.exit(1);
    }

    // Tạo fake data cho demo
    const fakeData = generateFakeData();

    // Khởi tạo UI
    const ui = new CLIUI(fakeData);

    // Thiết lập commands
    const program = setupCommands(ui);

    // Xử lý argument
    const args = process.argv;

    if (args.length <= 2) {
      // Nếu không có argument, hiển thị interactive mode
      ui.renderAll();

      // Hiển thị thông tin backend
      if (serverStatus.isNew) {
        console.log(
          chalk.gray(
            `\n💡 Backend server is running on port ${backend.getPort()}`
          )
        );
      } else {
        console.log(
          chalk.gray(
            `\n💡 Connected to backend server on port ${backend.getPort()}`
          )
        );
      }

      console.log(
        chalk.gray(
          `\n💬 Type your message and press Enter to chat (Ctrl+C to exit)\n`
        )
      );

      // Import ResponseManager
      const { ResponseManager } = await import("./api/response.js");
      const responseManager = ResponseManager.getInstance();

      // Giữ process chạy và lắng nghe input
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      let inputBuffer = "";

      // Lắng nghe input từ user
      process.stdin.on("data", async (data: string) => {
        inputBuffer += data;

        // Kiểm tra nếu có newline (user nhấn Enter)
        if (inputBuffer.includes("\n")) {
          const message = inputBuffer.trim();
          inputBuffer = "";

          if (message) {
            try {
              // Gửi request đến backend
              const result = await responseManager.sendRequest(
                message,
                backend.getPort()
              );

              // Hiển thị response
              console.log(
                chalk.cyan(`\n📤 You: ${chalk.white(result.userRequest)}`)
              );
              console.log(
                chalk.green(`💬 AI: ${chalk.white(result.response)}\n`)
              );
            } catch (error) {
              console.log(
                chalk.red(
                  `\n❌ Error: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }\n`
                )
              );
            }
          }

          // Hiển thị prompt cho input tiếp theo
          process.stdout.write(chalk.gray("> "));
        }
      });

      // Hiển thị prompt ban đầu
      process.stdout.write(chalk.gray("> "));

      // Lắng nghe Ctrl+C để thoát
      process.on("SIGINT", async () => {
        console.log(chalk.yellow("\n\n👋 Goodbye!"));
        // Chỉ dừng server nếu đây là instance đầu tiên khởi tạo nó
        if (serverStatus.isNew) {
          await backend.stop();
        }
        process.exit(0);
      });
    } else {
      // Nếu có argument, parse commands
      program.parse(args);
    }
  } catch (error) {
    console.error(chalk.red("❌ Error starting ZenCLI:"), error);
    process.exit(1);
  }
}

// Auto-run khi file được execute trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
  startCLI();
}
