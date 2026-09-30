/**
 * Minimal ambient declarations for the Node.js APIs this project uses.
 *
 * Why this file exists: @types/node cannot be installed in this sandbox
 * (no npm registry access — see DESIGN_BRIEF.md Section D). Node's
 * runtime APIs work fine without this file; TypeScript just needs to be
 * told their shapes. This declares ONLY the subset of Node's API surface
 * StoreOps actually calls — it is not a general-purpose @types/node
 * replacement.
 */

declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare const process: {
  env: Record<string, string | undefined>;
};

declare const require: {
  main: unknown;
};

declare const module: unknown;

declare class URL {
  constructor(input: string, base?: string);
  pathname: string;
  searchParams: {
    forEach(callback: (value: string, key: string) => void): void;
  };
}

declare module "node:crypto" {
  export function randomUUID(): string;
}

declare module "node:http" {
  export interface IncomingHttpHeaders {
    [key: string]: string | string[] | undefined;
  }

  export class IncomingMessage {
    method?: string;
    url?: string;
    headers: IncomingHttpHeaders;
    on(event: "data", listener: (chunk: Buffer | string) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
  }

  export class ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(data?: string): void;
  }

  export class Server {
    listen(port: number, callback?: () => void): this;
    close(callback?: () => void): this;
  }

  export function createServer(
    requestListener: (req: IncomingMessage, res: ServerResponse) => void
  ): Server;

  export class ClientRequest {
    on(event: "error", listener: (err: Error) => void): this;
    write(chunk: string): void;
    end(): void;
  }

  export interface RequestOptions {
    hostname?: string;
    port?: number;
    path?: string;
    method?: string;
    headers?: Record<string, string | number>;
  }

  export function request(
    options: RequestOptions,
    callback: (res: IncomingMessage & { statusCode?: number }) => void
  ): ClientRequest;
}

declare module "node:test" {
  export interface TestContext {
    test: (name: string, fn: (t?: TestContext) => void | Promise<void>) => void | Promise<void>;
  }
  function test(name: string, fn: (t: TestContext) => void | Promise<void>): void | Promise<void>;
  export function describe(name: string, fn: () => void): void;
  export default test;
}

declare module "node:assert" {
  interface Assert {
    (value: unknown, message?: string): void;
    strictEqual(actual: unknown, expected: unknown, message?: string): void;
    deepStrictEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
    throws(fn: () => unknown, message?: string): void;
    fail(message?: string): never;
  }
  const assert: Assert;
  export default assert;
}

declare function setImmediate(callback: () => void): void;

declare class Buffer {
  toString(encoding?: string): string;
  static byteLength(input: string): number;
}
