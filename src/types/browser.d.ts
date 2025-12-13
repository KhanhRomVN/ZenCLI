// File: src/types/browser.d.ts
// Type declarations for browser context in Puppeteer page.evaluate()

declare global {
  interface Window {
    localStorage: Storage;
    document: Document;
  }

  interface Storage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
    readonly length: number;
    key(index: number): string | null;
  }

  interface Document {
    querySelector(selectors: string): Element | null;
    querySelectorAll(selectors: string): NodeListOf<Element>;
  }

  interface Element {
    textContent: string | null;
    innerHTML: string;
    getAttribute(name: string): string | null;
  }

  interface NodeListOf<TNode> extends Array<TNode> {}
}

export {};
