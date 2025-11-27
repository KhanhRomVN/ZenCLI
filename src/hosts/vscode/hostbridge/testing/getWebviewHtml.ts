/**
 * Returns the HTML for the webview index page for testing
 */
export async function getWebviewHtml(): Promise<any> {
  // For standalone CLI, return a simple HTML page for testing
  return {
    value: `<!DOCTYPE html>
<html lang="en">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>Cline CLI - Testing
</title>
</head>
<body>
 <h1>Cline CLI Testing</h1>
 <p>This is the testing webview for standalone CLI mode.
</p>
</body>
</html>`,
  };
}
