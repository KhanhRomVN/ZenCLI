import express, { Express, Request, Response } from "express";
import { Server } from "http";
import chalk from "chalk";
import net from "net";
import fs from "fs";
import path from "path";
import os from "os";

export class BackendServer {
  private static instance: BackendServer | null = null;
  private app: Express;
  private server: Server | null = null;
  private port: number = 25052;
  private isRunning: boolean = false;
  private clientId: string = "";
  private lockFilePath: string = "";
  private responseMode: "fake_response" | "real_response" = "fake_response";

  private constructor() {
    this.app = express();
    this.clientId = this.generateClientId();
    this.lockFilePath = path.join(os.tmpdir(), "zencli-server.lock");
    this.setupMiddleware();
    this.setupRoutes();
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private readLockFile(): { clients: string[]; port: number } {
    try {
      if (fs.existsSync(this.lockFilePath)) {
        const data = fs.readFileSync(this.lockFilePath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      // Ignore errors
    }
    return { clients: [], port: this.port };
  }

  private writeLockFile(clients: string[]): void {
    try {
      const data = { clients, port: this.port };
      fs.writeFileSync(this.lockFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(chalk.red("Failed to write lock file:"), error);
    }
  }

  private addClient(): void {
    const lockData = this.readLockFile();
    if (!lockData.clients.includes(this.clientId)) {
      lockData.clients.push(this.clientId);
      this.writeLockFile(lockData.clients);
    }
  }

  private removeClient(): void {
    const lockData = this.readLockFile();
    const updatedClients = lockData.clients.filter(
      (id) => id !== this.clientId
    );
    this.writeLockFile(updatedClients);
  }

  private getClientCount(): number {
    return this.readLockFile().clients.length;
  }

  public getResponseMode(): "fake_response" | "real_response" {
    return this.responseMode;
  }

  public setResponseMode(mode: "fake_response" | "real_response"): void {
    this.responseMode = mode;
  }

  public static getInstance(): BackendServer {
    if (!BackendServer.instance) {
      BackendServer.instance = new BackendServer();
    }
    return BackendServer.instance;
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS middleware
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      res.header("Access-Control-Allow-Headers", "Content-Type");
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({
        status: "ok",
        port: this.port,
        timestamp: new Date().toISOString(),
      });
    });

    // Chat endpoint with fake/real response
    this.app.post("/api/chat", (req: Request, res: Response) => {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: "Missing message in request body",
        });
      }

      if (this.responseMode === "fake_response") {
        // Generate fake response
        const fakeResponses = [
          "Tôi đã hiểu yêu cầu của bạn và đang xử lý...",
          "Đây là một câu trả lời giả lập từ backend.",
          "Chức năng này đang được phát triển.",
          "Tôi sẽ giúp bạn với điều đó ngay lập tức.",
          "Đã nhận được yêu cầu của bạn.",
        ];

        const randomResponse =
          fakeResponses[Math.floor(Math.random() * fakeResponses.length)];

        return res.json({
          success: true,
          userRequest: message,
          response: randomResponse,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Real response (to be implemented later)
        return res.json({
          success: true,
          userRequest: message,
          response: "Real response feature is not implemented yet.",
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Get config
    this.app.get("/config", (req: Request, res: Response) => {
      res.json({
        message: "Config endpoint",
        port: this.port,
      });
    });

    // Get/Set response mode
    this.app.get("/api/response-mode", (req: Request, res: Response) => {
      res.json({
        mode: this.responseMode,
      });
    });

    this.app.post("/api/response-mode", (req: Request, res: Response) => {
      const { mode } = req.body;
      if (mode === "fake_response" || mode === "real_response") {
        this.responseMode = mode;
        res.json({
          success: true,
          mode: this.responseMode,
        });
      } else {
        res.status(400).json({
          success: false,
          error: "Invalid mode. Use: fake_response or real_response",
        });
      }
    });

    // API status
    this.app.get("/api/status", (req: Request, res: Response) => {
      res.json({
        running: true,
        port: this.port,
        uptime: process.uptime(),
        clients: this.getClientCount(),
      });
    });

    // Register client
    this.app.post("/api/register", (req: Request, res: Response) => {
      const { clientId } = req.body;
      if (clientId) {
        const lockData = this.readLockFile();
        if (!lockData.clients.includes(clientId)) {
          lockData.clients.push(clientId);
          this.writeLockFile(lockData.clients);
        }
        res.json({ success: true, clientCount: lockData.clients.length });
      } else {
        res.status(400).json({ success: false, error: "Missing clientId" });
      }
    });

    // Unregister client
    this.app.post("/api/unregister", (req: Request, res: Response) => {
      const { clientId } = req.body;
      if (clientId) {
        const lockData = this.readLockFile();
        const updatedClients = lockData.clients.filter((id) => id !== clientId);
        this.writeLockFile(updatedClients);
        res.json({ success: true, clientCount: updatedClients.length });
      } else {
        res.status(400).json({ success: false, error: "Missing clientId" });
      }
    });
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      server.once("listening", () => {
        server.close();
        resolve(true);
      });

      server.listen(port);
    });
  }

  private async checkExistingServer(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://localhost:${this.port}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  public async start(): Promise<{ success: boolean; isNew: boolean }> {
    try {
      // Check if server is already running
      const existingServer = await this.checkExistingServer();

      if (existingServer) {
        // Register this client with existing server
        try {
          await fetch(`http://localhost:${this.port}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId: this.clientId }),
          });
          console.log(
            chalk.yellow(
              `⚡ Connected to existing backend server at port ${
                this.port
              } (${this.getClientCount()} active clients)`
            )
          );
        } catch (error) {
          this.addClient();
        }
        return { success: true, isNew: false };
      }

      // Check if port is available
      const portAvailable = await this.isPortAvailable(this.port);

      if (!portAvailable) {
        console.log(
          chalk.red(`❌ Port ${this.port} is in use but no valid server found`)
        );
        return { success: false, isNew: false };
      }

      // Start new server
      return new Promise((resolve) => {
        this.server = this.app.listen(this.port, () => {
          this.isRunning = true;
          this.addClient();
          console.log(
            chalk.green(
              `🚀 Backend server started successfully at port ${this.port}`
            )
          );
          resolve({ success: true, isNew: true });
        });

        this.server.on("error", (error: any) => {
          if (error.code === "EADDRINUSE") {
            console.log(
              chalk.yellow(
                `⚡ Port ${this.port} already in use, connecting to existing server...`
              )
            );
            this.addClient();
            resolve({ success: true, isNew: false });
          } else {
            console.error(chalk.red(`❌ Server error: ${error.message}`));
            resolve({ success: false, isNew: false });
          }
        });
      });
    } catch (error) {
      console.error(chalk.red("❌ Failed to start backend server:"), error);
      return { success: false, isNew: false };
    }
  }

  public async stop(): Promise<void> {
    // Unregister this client
    try {
      await fetch(`http://localhost:${this.port}/api/unregister`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: this.clientId }),
      });
    } catch (error) {
      this.removeClient();
    }

    const remainingClients = this.getClientCount();

    // Only stop server if no clients remain
    if (this.server && this.isRunning && remainingClients === 0) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.isRunning = false;
          // Clean up lock file
          try {
            if (fs.existsSync(this.lockFilePath)) {
              fs.unlinkSync(this.lockFilePath);
            }
          } catch (error) {
            // Ignore cleanup errors
          }
          console.log(
            chalk.yellow(`👋 Backend server stopped at port ${this.port}`)
          );
          resolve();
        });
      });
    } else {
      console.log(
        chalk.gray(
          `👋 Disconnected from backend server (${remainingClients} clients still connected)`
        )
      );
    }
  }

  public getPort(): number {
    return this.port;
  }

  public getStatus(): boolean {
    return this.isRunning;
  }

  public getClientId(): string {
    return this.clientId;
  }
}
