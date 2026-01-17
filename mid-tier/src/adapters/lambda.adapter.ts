/**
 * Lambda Adapter - DEPRECATED
 * 
 * This file is kept for reference only.
 * 
 * Use lambda-handler.ts instead:
 *   Handler: dist/lambda-handler.handler
 * 
 * The new lambda-handler.ts provides:
 * - Cleaner integration with serverless-http
 * - Better logging and error handling
 * - Proper environment variable loading
 * - Health check endpoint
 * 
 * Migration:
 * In SAM template (template.yaml), update:
 *   OLD: Handler: dist/adapters/lambda.adapter.handler
 *   NEW: Handler: dist/lambda-handler.handler
 */

import serverless from "serverless-http";
import { app } from "./express.adapter";
import logger from "../services/logger";

/**
 * Lambda handler
 * Converts API Gateway events to Express requests
 * 
 * DEPRECATED: Use lambda-handler.ts instead
 */
export const handler = serverless(app, {
  binary: ["image/*", "font/*"],
  provider: "aws",
});

logger.warn(
  "Lambda adapter is deprecated. Use lambda-handler.ts instead."
);
