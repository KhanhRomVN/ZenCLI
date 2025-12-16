export type MenuItem = {
  label: string;
  value: string;
  description?: string; // Shown in the preview box
  children?: MenuItem[];
  action?: string; // Special action identifier if it's a leaf node
};

export const menuConfig: MenuItem[] = [
  {
    label: "📂 Coding",
    value: "coding",
    description: "Development tools and utilities",
    children: [
      {
        label: "Git",
        value: "git",
        description: "Git automation and helpers",
        children: [
          {
            label: "Auto Generator Commit Message",
            value: "auto-commit",
            description:
              "Generate commit messages using AI based on staged changes",
            action: "git-auto-commit",
          },
        ],
      },
    ],
  },
  {
    label: "🔧 Network",
    value: "network",
    description: "Network analysis and security tools",
    children: [
      {
        label: "HTTP/HTTPS Proxy Traffic Analyzer",
        value: "proxy-analyzer",
        description: "Analyze and intercept HTTP/HTTPS traffic",
        action: "proxy-analyzer",
      },
      {
        label: "Wireless Brute Force",
        value: "wifi-brute",
        description: "Wireless network security testing tools",
        action: "wifi-brute",
      },
    ],
  },
  {
    label: "📊 Hacking",
    value: "hacking",
    description: "Security testing and penetration tools (My Favorite)",
    children: [
      {
        label: "Coming Soon",
        value: "coming-soon",
        description: "More tools coming soon...",
        action: "coming-soon",
      },
    ],
  },
  {
    label: "🤖 Agent (Claude)",
    value: "agent",
    description: "Manage your Claude AI agent settings and accounts",
    children: [
      {
        label: "Account Manager",
        value: "account-manager",
        description: "Add, remove, or switch Claude accounts",
        action: "account-manager",
      },
      {
        label: "Settings",
        value: "agent-settings",
        description: "Configure agent behavior and preferences",
        action: "agent-settings",
      },
    ],
  },
  {
    label: "💻 Server",
    value: "server",
    description: "Manage the local ZenCLI server",
    children: [
      {
        label: "Settings",
        value: "server-settings",
        description: "Configure server port and other options",
        action: "server-settings",
      },
      {
        label: "Routes",
        value: "server-routes",
        description: "View available API routes and documentation",
        action: "server-routes",
      },
    ],
  },
  {
    label: "🔩 Settings",
    value: "settings",
    description: "Global CLI settings",
    children: [
      {
        label: "Language",
        value: "language",
        description: "Change the interface language",
        action: "language-settings",
      },
      {
        label: "Theme",
        value: "theme",
        description: "Customize the CLI appearance",
        action: "theme-settings",
      },
    ],
  },
  {
    label: "📘 Other",
    value: "other",
    description: "About ZenCLI",
    children: [
      {
        label: "About",
        value: "about",
        description: "Version, Author, and License info",
        action: "show-about",
      },
    ],
  },
];
