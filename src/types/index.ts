export interface CLIConfig {
  model: string;
  provider: "LiteLLM" | "Gemini";
  requestsUsed: number;
  contextUsed: string;
  currentFolder: string;
  mode: "interactive" | "auto" | "debug";
  task: string;
}

export interface Shortcut {
  key: string;
  description: string;
  action: () => void;
}
