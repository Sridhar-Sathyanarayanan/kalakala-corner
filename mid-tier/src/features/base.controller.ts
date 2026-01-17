/**
 * Base Controller Class
 * Provides common response methods for all feature controllers
 * Ensures consistent response formatting across the application
 */

import { Response } from "express";

export interface ControllerResponse<T = any> {
  success: boolean;
  statusCode: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export class BaseController {
  /**
   * Build success response
   */
  protected success<T = any>(data: T, statusCode: number = 200): ControllerResponse<T> {
    return {
      success: true,
      statusCode,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build created (201) response
   */
  protected created<T = any>(data: T): ControllerResponse<T> {
    return this.success(data, 201);
  }

  /**
   * Build bad request (400) response
   */
  protected badRequest(message: string, code: string = "BAD_REQUEST", details?: any): ControllerResponse<null> {
    return {
      success: false,
      statusCode: 400,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build unauthorized (401) response
   */
  protected unauthorized(message: string = "Unauthorized", code: string = "UNAUTHORIZED"): ControllerResponse<null> {
    return {
      success: false,
      statusCode: 401,
      error: {
        code,
        message,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build forbidden (403) response
   */
  protected forbidden(message: string = "Forbidden", code: string = "FORBIDDEN"): ControllerResponse<null> {
    return {
      success: false,
      statusCode: 403,
      error: {
        code,
        message,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build not found (404) response
   */
  protected notFound(message: string = "Not found", code: string = "NOT_FOUND"): ControllerResponse<null> {
    return {
      success: false,
      statusCode: 404,
      error: {
        code,
        message,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build server error (500) response
   */
  protected serverError(message: string = "Internal server error", code: string = "INTERNAL_SERVER_ERROR", details?: any): ControllerResponse<null> {
    return {
      success: false,
      statusCode: 500,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send response to client
   */
  protected sendResponse(res: Response, response: ControllerResponse): Response {
    return res.status(response.statusCode).json(response);
  }
}
