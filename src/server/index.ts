import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import chalk from "chalk";
import { logger } from "../core/lib/logger.js";
import { requestLogger } from "./api/middlewares/logger.js";
import accountRoutes from "./api/routes/accounts.js";
import chatRoutes from "./api/routes/chat.js";

const DEFAULT_PORT = 3000;

export class ZenCLIServer {
  private app: Express;
  private port: number;

  constructor(port: number = DEFAULT_PORT) {
    this.app = express();
    this.port = port;
    logger.setMode("server"); // Set logger to server mode (terminal output)
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));
    this.app.use(requestLogger);

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: "Too many requests from this IP, please try again later.",
    });
    this.app.use(limiter);
  }

  private setupRoutes() {
    // Health Check
    this.app.get("/v1/health", (req: Request, res: Response) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // API Routes
    this.app.use("/v1/accounts", accountRoutes);
    this.app.use("/v1/chat", chatRoutes);

    // Root info
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        name: "ZenCLI Server",
        version: "1.0.0",
        status: "running",
        endpoints: {
          health: "/v1/health",
          accounts: "/v1/accounts",
          chat: "/v1/chat",
        },
      });
    });
  }

  private setupErrorHandling() {
    this.app.use((err: Error, req: Request, res: Response, next: any) => {
      logger.error(
        "Unhandled error",
        { error: err.message, stack: err.stack },
        "Server"
      );

      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    });
  }

  start() {
    return new Promise<void>((resolve, reject) => {
      try {
        const server = this.app.listen(this.port, () => {
          logger.info(`Server started`, { port: this.port }, "Server");
          console.log(chalk.green(`✅ Server is running`));
          console.log();
          console.log(chalk.bold.cyan("📡 API Endpoints:"));
          console.log(
            chalk.white(
              `   Health:        http://localhost:${this.port}/v1/health`
            )
          );
          console.log(
            chalk.white(
              `   Accounts:      http://localhost:${this.port}/v1/accounts`
            )
          );
          console.log(
            chalk.white(
              `   Chat:          http://localhost:${this.port}/v1/chat`
            )
          );
          console.log();
          console.log(chalk.gray("─".repeat(60)));
          console.log(chalk.yellow("⚡ Server is ready to accept requests"));
          console.log(chalk.gray("─".repeat(60)));
          console.log();
          resolve();
        });

        server.on("error", (error: any) => {
          if (error.code === "EADDRINUSE") {
            logger.error(`Port ${this.port} is already in use`, {}, "Server");
            reject(
              new Error(
                `Port ${this.port} is already in use. Please close the other application or use a different port.`
              )
            );
          } else {
            logger.error("Server error", { error: error.message }, "Server");
            reject(error);
          }
        });
      } catch (error) {
        logger.error("Failed to start server", { error }, "Server");
        reject(error);
      }
    });
  }
}

export async function startServer(port?: number) {
  const server = new ZenCLIServer(port);
  await server.start();
}
