/**
 * Lambda Handler Entry Point
 * 
 * AWS Lambda will invoke this handler for API Gateway events.
 * The handler is wrapped with serverless-http to convert API Gateway 
 * events to Express-compatible requests.
 * 
 * SAM Template Configuration:
 * ```yaml
 * ProductsFunction:
 *   Type: AWS::Serverless::Function
 *   Properties:
 *     Handler: dist/lambda-handler.handler
 * ```
 */

import serverless from "serverless-http";
import logger from "./services/logger";

// Load environment variables
if (process.env.ENVIRONMENT !== "production") {
  require("dotenv").config();
}

// Initialize Express app
import { createExpressApp } from "./adapters/express.adapter";

const app = createExpressApp();

/**
 * Main Lambda handler
 * Wraps the Express app with serverless-http to handle API Gateway events
 */
export const handler = serverless(app, {
  binary: ["image/*", "font/*"],
  provider: "aws",
});

/**
 * Health check Lambda handler (useful for testing)
 */
export const healthCheck = async (event: any, context: any) => {
  logger.info("Health check invoked");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.ENVIRONMENT || "dev",
    }),
  };
};

logger.info("Lambda handler initialized");
logger.info(`Environment: ${process.env.ENVIRONMENT || "dev"}`);
