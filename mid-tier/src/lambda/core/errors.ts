/**
 * Custom error types for Lambda handlers
 */

export interface ErrorContext {
  code: string;
  statusCode: number;
  message: string;
  details?: any;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: any;

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toErrorContext(): ErrorContext {
    return {
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Validation error - 400
 */
export class ValidationError extends AppError {
  constructor(message: string, public validationErrors?: Record<string, string[]>) {
    super("VALIDATION_ERROR", message, 400, validationErrors);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error - 401
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super("AUTHENTICATION_ERROR", message, 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error - 403
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super("AUTHORIZATION_ERROR", message, 403);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error - 404
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Database error - 500
 */
export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed", details?: any) {
    super("DATABASE_ERROR", message, 500, details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External service error - 502
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = "Service unavailable") {
    super(
      "EXTERNAL_SERVICE_ERROR",
      `${service}: ${message}`,
      502
    );
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Check if error is AppError
 */
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};
