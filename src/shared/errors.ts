/**
 * Typed error hierarchy for StoreOps.
 *
 * RULE (non-negotiable, see Section 3.5 "Error contract"):
 * No raw `Error` throws are permitted in services or routes. Every thrown
 * error in this codebase must extend AppError and carry a machine-readable
 * `code`, a human-readable `message`, and an HTTP `statusCode`.
 *
 * This directly closes failure mode #2 from the client engagement
 * (raw Error throws in service methods, bypassing the typed hierarchy).
 */

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
      },
    };
  }
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;

  constructor(message: string, public readonly fieldErrors?: Record<string, string>) {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
  readonly statusCode = 403;
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 401;
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT";
  readonly statusCode = 409;
}

export class InternalError extends AppError {
  readonly code = "INTERNAL_ERROR";
  readonly statusCode = 500;
}

export class NoResponsiblePartyError extends AppError {
  readonly code = "NO_RESPONSIBLE_PARTY";
  readonly statusCode = 500;
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
