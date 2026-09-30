/**
 * Minimal HTTP router — a deliberately small stand-in for Express.
 *
 * Why this exists: this sandbox has no npm registry access, so Express
 * cannot be installed. See DESIGN_BRIEF.md Section D for the full
 * architectural decision. This router supports exactly what StoreOps
 * needs: path params (:id), query params, JSON body parsing, and
 * centralized error handling — the same shape a Routes layer would get
 * from Express, so module route files read the same way they would in
 * the "real" stack.
 */

import * as http from "node:http";
import { AppError } from "./errors";

export interface StoreOpsRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: http.IncomingHttpHeaders;
}

export interface StoreOpsResponse {
  status: (code: number) => StoreOpsResponse;
  json: (body: unknown) => void;
}

type Handler = (req: StoreOpsRequest, res: StoreOpsResponse) => void | Promise<void>;

interface Route {
  method: string;
  pattern: string;
  segments: string[];
  handler: Handler;
}

function matchRoute(route: Route, method: string, pathSegments: string[]): Record<string, string> | null {
  if (route.method !== method) return null;
  if (route.segments.length !== pathSegments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < route.segments.length; i++) {
    const routeSeg = route.segments[i];
    const actualSeg = pathSegments[i];
    if (routeSeg.startsWith(":")) {
      params[routeSeg.slice(1)] = decodeURIComponent(actualSeg);
    } else if (routeSeg !== actualSeg) {
      return null;
    }
  }
  return params;
}

export class Router {
  private routes: Route[] = [];

  private register(method: string, pattern: string, handler: Handler): void {
    this.routes.push({
      method,
      pattern,
      segments: pattern.split("/").filter((s) => s.length > 0),
      handler,
    });
  }

  get(pattern: string, handler: Handler): void {
    this.register("GET", pattern, handler);
  }
  post(pattern: string, handler: Handler): void {
    this.register("POST", pattern, handler);
  }
  patch(pattern: string, handler: Handler): void {
    this.register("PATCH", pattern, handler);
  }
  delete(pattern: string, handler: Handler): void {
    this.register("DELETE", pattern, handler);
  }

  /** Merge another router's routes into this one (used to combine per-module routers). */
  use(other: Router): void {
    this.routes.push(...other.routes);
  }

  async handle(nodeReq: http.IncomingMessage, nodeRes: http.ServerResponse): Promise<void> {
    const url = new URL(nodeReq.url ?? "/", "http://localhost");
    const pathSegments = url.pathname.split("/").filter((s) => s.length > 0);
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (query[k] = v));

    const method = (nodeReq.method ?? "GET").toUpperCase();

    let matchedRoute: Route | null = null;
    let params: Record<string, string> = {};
    for (const route of this.routes) {
      const m = matchRoute(route, method, pathSegments);
      if (m) {
        matchedRoute = route;
        params = m;
        break;
      }
    }

    const res: StoreOpsResponse = {
      status(code: number) {
        nodeRes.statusCode = code;
        return res;
      },
      json(body: unknown) {
        nodeRes.setHeader("Content-Type", "application/json");
        nodeRes.end(JSON.stringify(body));
      },
    };

    if (!matchedRoute) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${method} ${url.pathname}`, statusCode: 404 } });
      return;
    }

    let body: unknown = undefined;
    if (method === "POST" || method === "PATCH") {
      body = await readJsonBody(nodeReq);
    }

    const req: StoreOpsRequest = {
      method,
      path: url.pathname,
      params,
      query,
      body,
      headers: nodeReq.headers,
    };

    try {
      await matchedRoute.handler(req, res);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json(err.toJSON());
      } else {
        // This branch should be unreachable if the "no raw Error" rule is
        // followed everywhere. If it IS reached, that's a hard-gate failure
        // for the Evaluator to catch.
        res.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "Unexpected error", statusCode: 500 },
        });
      }
    }
  }
}

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined); // validation layer will reject malformed/missing body
      }
    });
    req.on("error", reject);
  });
}
