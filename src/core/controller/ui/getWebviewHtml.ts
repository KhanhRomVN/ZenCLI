import { Controller } from "../index";
import { EmptyRequest, String } from "../../../shared/proto/cline/common";

/**
 * Returns the HTML for the webview index page. This is only used by external clients, not by the vscode webview.
 */
export async function getWebviewHtml(
  controller: Controller,
  request: EmptyRequest
): Promise<String> {
  // For standalone CLI, return a simple HTML page
  return String.create({
    value: `<!DOCTYPE html>
<html lang="en">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>Cline CLI
</title>
 <style>
 body { 
 font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
 margin: 0; 
 padding: 20px; 
 background: #f5f5f5; 
 }
 .container { 
 max-width: 800px; 
 margin: 0 auto; 
 background: white; 
 padding: 20px; 
 border-radius: 8px; 
 box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
 }
 h1 { color: #333; }
 p { color: #666; line-height: 1.6; }
 
</style>
</head>
<body>
 <div class="container">
 <h1>Cline CLI</h1>
 <p>This is the standalone CLI version of Cline. The webview interface is not available in CLI mode.
</p>
 <p>Please use the command line interface for all operations.
</p>
 
</div>
</body>
</html>`,
  });
}
