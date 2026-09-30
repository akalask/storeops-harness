/**
 * Tiny HTTP client for integration tests — avoids depending on global
 * fetch typings (which would require the "dom" lib) by using node:http
 * directly, consistent with the rest of this zero-dependency project.
 */
import * as http from "node:http";

export interface TestResponse {
  status: number;
  body: unknown;
}

export function request(
  port: number,
  method: string,
  path: string,
  body?: unknown
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "localhost",
        port,
        path,
        method,
        headers: payload
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
          : {},
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsedBody: unknown = undefined;
          try {
            parsedBody = raw ? JSON.parse(raw) : undefined;
          } catch {
            parsedBody = raw;
          }
          resolve({ status: res.statusCode ?? 0, body: parsedBody });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
