/**
 * DynamoDB Client Factory
 * 
 * For production use, call getDynamoDocumentClient() to get
 * a pooled, reusable client instance.
 * 
 * For backward compatibility, createDDBDocClient() is still available
 * but deprecated.
 */

import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ConnectionPool } from "./connection-pool";
import logger from "../services/logger";

/**
 * DEPRECATED: Use getDynamoDocumentClient() instead
 * 
 * This creates a new client every time. For production use with
 * connection pooling, use ConnectionPool.getDynamoDocumentClient()
 */
export function createDDBDocClient(): DynamoDBDocumentClient {
  logger.warn(
    "createDDBDocClient() is deprecated. Use ConnectionPool.getDynamoDocumentClient() instead."
  );
  return ConnectionPool.getDynamoDocumentClient();
}

/**
 * Get pooled DynamoDB document client
 * Reuses connections for Beanstalk deployment
 * Safe for Lambda (new instance per invocation)
 */
export function getDynamoDocumentClient(): DynamoDBDocumentClient {
  return ConnectionPool.getDynamoDocumentClient();
}

export default { createDDBDocClient, getDynamoDocumentClient };

