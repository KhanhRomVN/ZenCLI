export interface ChatResponse {
  success: boolean;
  userRequest: string;
  response: string;
  timestamp: string;
}

export class ResponseManager {
  private static instance: ResponseManager | null = null;

  private constructor() {}

  public static getInstance(): ResponseManager {
    if (!ResponseManager.instance) {
      ResponseManager.instance = new ResponseManager();
    }
    return ResponseManager.instance;
  }

  public async sendRequest(
    userRequest: string,
    backendPort: number
  ): Promise<{ userRequest: string; response: string }> {
    try {
      const response = await fetch(`http://localhost:${backendPort}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userRequest,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as ChatResponse;

      return {
        userRequest: data.userRequest,
        response: data.response,
      };
    } catch (error) {
      throw new Error(
        `Failed to send request to backend: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
