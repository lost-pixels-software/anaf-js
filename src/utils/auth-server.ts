/**
 * OAuth Callback Server using Bun's native HTTP server
 */

export interface OAuthCallbackData {
  code?: string;
  error?: string;
}

export interface AuthServerConfig {
  port?: number;
  host?: string;
}

export interface AuthServerResult {
  /** The authorization code received from ANAF */
  code: string;
}

/**
 * Start a local HTTP server to receive OAuth callback
 * Returns a promise that resolves when the callback is received
 */
export async function startAuthServer(config: AuthServerConfig = {}): Promise<{
  authPromise: Promise<AuthServerResult>;
  url: string;
  stop: () => void;
}> {
  const port = config.port ?? 3000;
  const host = config.host ?? "localhost";

  let resolveAuth: (value: AuthServerResult) => void;
  let rejectAuth: (error: Error) => void;

  const authPromise = new Promise<AuthServerResult>((resolve, reject) => {
    resolveAuth = resolve;
    rejectAuth = reject;
  });

  const server = Bun.serve({
    port,
    hostname: host,
    fetch(request) {
      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === "/health") {
        return new Response(
          JSON.stringify({
            status: "OK",
            message: "OAuth callback server is running",
            timestamp: new Date().toISOString(),
            port,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Test endpoint
      if (url.pathname === "/test") {
        return new Response(
          `<!DOCTYPE html>
<html>
<head><title>OAuth Test</title></head>
<body>
  <h2>✅ OAuth Callback Server is Running</h2>
  <p>Server: http://${host}:${port}</p>
  <p>Callback URL: http://${host}:${port}/callback</p>
  <p>Time: ${new Date().toISOString()}</p>
</body>
</html>`,
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      // OAuth callback endpoint
      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        console.log("\n📥 OAuth Callback received:", {
          code: code ? `${code.substring(0, 20)}...` : "none",
          error: error || "none",
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.log(`❌ OAuth error: ${error}`);
          rejectAuth(new Error(`OAuth error: ${error}`));

          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>OAuth Error</title></head>
<body>
  <h2>❌ OAuth Error</h2>
  <p>Error: ${error}</p>
  <p>You can close this window.</p>
</body>
</html>`,
            {
              status: 400,
              headers: { "Content-Type": "text/html" },
            }
          );
        }

        if (code) {
          console.log(
            `✅ Authorization code captured: ${code.substring(0, 20)}...`
          );
          resolveAuth({ code });

          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Authorization Successful</title></head>
<body>
  <h2>✅ Authorization Successful!</h2>
  <p>Authorization code captured successfully.</p>
  <p>You can close this window.</p>
  <script>setTimeout(() => window.close(), 3000);</script>
</body>
</html>`,
            {
              headers: { "Content-Type": "text/html" },
            }
          );
        }

        console.log("❌ No authorization code in callback");
        return new Response(
          `<!DOCTYPE html>
<html>
<head><title>Missing Code</title></head>
<body>
  <h2>❌ Missing Authorization Code</h2>
  <p>No authorization code received.</p>
  <p>You can close this window.</p>
</body>
</html>`,
          {
            status: 400,
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      // 404 for other routes
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(
    `🌐 OAuth callback server running on http://${host}:${port}\n` +
      `🔗 Test URL: http://${host}:${port}/test\n` +
      `📥 Callback URL: http://${host}:${port}/callback`
  );

  return {
    authPromise,
    url: `http://${host}:${port}/callback`,
    stop: () => {
      server.stop();
      console.log("🛑 OAuth callback server stopped");
    },
  };
}

/**
 * Run OAuth flow interactively
 * Starts server, opens browser, waits for callback
 */
export async function runOAuthFlow(
  authUrl: string,
  config: AuthServerConfig = {}
): Promise<AuthServerResult> {
  const { authPromise, url, stop } = await startAuthServer(config);

  console.log("\n🔐 Opening browser for ANAF authentication...");
  console.log(`📋 If browser doesn't open, visit:\n${authUrl}\n`);

  // Try to open browser (works on macOS, Linux, Windows)
  try {
    const { spawn } = await import("child_process");
    const platform = process.platform;

    if (platform === "darwin") {
      spawn("open", [authUrl]);
    } else if (platform === "win32") {
      spawn("cmd", ["/c", "start", authUrl]);
    } else {
      spawn("xdg-open", [authUrl]);
    }
  } catch {
    console.log("⚠️ Could not open browser automatically");
  }

  try {
    const result = await authPromise;
    return result;
  } finally {
    stop();
  }
}
