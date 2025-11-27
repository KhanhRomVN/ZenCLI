// WebviewProvider removed for CLI-only build
export class ExternalWebviewProvider {
  // This hostname cannot be changed without updating the external webview handler.
  private RESOURCE_HOSTNAME: string = "internal.resources";

  getWebviewUrl(path: string) {
    const url = new URL(`https://${this.RESOURCE_HOSTNAME}/`);
    url.pathname = path;
    return url.toString();
  }
  getCspSource() {
    return `'self' https://${this.RESOURCE_HOSTNAME}`;
  }
  isVisible() {
    return true;
  }
}
