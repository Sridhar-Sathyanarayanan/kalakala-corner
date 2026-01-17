import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

/**
 * Standardized response envelope for all Lambda functions
 */
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Response builder class for consistent response formatting
 */
export class ResponseBuilder {
  private requestId?: string;

  constructor(requestId?: string) {
    this.requestId = requestId;
  }

  /**
   * Success response with data
   */
  success<T>(data: T, statusCode: number = 200): APIGatewayProxyResult {
    const response: ApiResponse<T> = {
      success: true,
      statusCode,
      data,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    };

    return {
      statusCode,
      body: JSON.stringify(response),
      headers: this.getHeaders(),
    };
  }

  /**
   * Success response with custom message
   */
  ok(message: string = "Success", statusCode: number = 200): APIGatewayProxyResult {
    const response: ApiResponse = {
      success: true,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    };

    return {
      statusCode,
      body: JSON.stringify(response),
      headers: this.getHeaders(),
    };
  }

  /**
   * Created response (201)
   */
  created<T>(data: T, message?: string): APIGatewayProxyResult {
    const response: ApiResponse<T> = {
      success: true,
      statusCode: 201,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    };

    return {
      statusCode: 201,
      body: JSON.stringify(response),
      headers: this.getHeaders(),
    };
  }

  /**
   * Error response with standardized format
   */
  error(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: any
  ): APIGatewayProxyResult {
    const response: ApiResponse = {
      success: false,
      statusCode,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    };

    return {
      statusCode,
      body: JSON.stringify(response),
      headers: this.getHeaders(),
    };
  }

  /**
   * Validation error response (400)
   */
  validationError(
    errors: Record<string, string | string[]>,
    message?: string
  ): APIGatewayProxyResult {
    return this.error(
      "VALIDATION_ERROR",
      message || "Validation failed",
      400,
      errors
    );
  }

  /**
   * Unauthorized response (401)
   */
  unauthorized(message: string = "Unauthorized"): APIGatewayProxyResult {
    return this.error("UNAUTHORIZED", message, 401);
  }

  /**
   * Forbidden response (403)
   */
  forbidden(message: string = "Forbidden"): APIGatewayProxyResult {
    return this.error("FORBIDDEN", message, 403);
  }

  /**
   * Not found response (404)
   */
  notFound(message: string = "Resource not found"): APIGatewayProxyResult {
    return this.error("NOT_FOUND", message, 404);
  }

  /**
   * Internal server error response (500)
   */
  internalServerError(
    message: string = "Internal server error",
    details?: any
  ): APIGatewayProxyResult {
    return this.error("INTERNAL_SERVER_ERROR", message, 500, details);
  }

  /**
   * Get response headers with CORS and content type
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.ORIGIN || "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    };
  }
}
