/**
 * Base Controller Class
 * Provides common response methods for all feature controllers
 * Ensures consistent response formatting across the application
 */

import { Response } from "express";

export interface ControllerResponse<T = any> {
  statusCode: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class BaseController {
  /**
   * Build success response
   */
  protected success<T = any>(
    data: T,
    statusCode: number = 200,
  ): ControllerResponse<T> {
    return {
      statusCode,
      data,
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
  protected badRequest(
    message: string,
    code: string = "BAD_REQUEST",
    details?: any,
  ): ControllerResponse<null> {
    return {
      statusCode: 400,
      error: {
        code,
        message,
        details,
      },
    };
  }

  /**
   * Build unauthorized (401) response
   */
  protected unauthorized(
    message: string = "Unauthorized",
    code: string = "UNAUTHORIZED",
  ): ControllerResponse<null> {
    return {
      statusCode: 401,
      error: {
        code,
        message,
      },
    };
  }

  /**
   * Build forbidden (403) response
   */
  protected forbidden(
    message: string = "Forbidden",
    code: string = "FORBIDDEN",
  ): ControllerResponse<null> {
    return {
      statusCode: 403,
      error: {
        code,
        message,
      },
    };
  }

  /**
   * Build not found (404) response
   */
  protected notFound(
    message: string = "Not found",
    code: string = "NOT_FOUND",
  ): ControllerResponse<null> {
    return {
      statusCode: 404,
      error: {
        code,
        message,
      },
    };
  }

  /**
   * Build server error (500) response
   */
  protected serverError(
    message: string = "Internal server error",
    code: string = "INTERNAL_SERVER_ERROR",
    details?: any,
  ): ControllerResponse<null> {
    return {
      statusCode: 500,
      error: {
        code,
        message,
        details,
      },
    };
  }

  /**
   * Send response to client
   */
  protected sendResponse(
    res: Response,
    response: ControllerResponse,
  ): Response {
    return res.status(response.statusCode).json(response);
  }
}
