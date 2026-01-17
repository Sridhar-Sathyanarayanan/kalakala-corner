/**
 * S3 Client Factory
 * 
 * For production use, call getS3Client() to get
 * a pooled, reusable client instance.
 * 
 * For backward compatibility, createS3Client() is still available
 * but deprecated.
 */

import { S3Client } from "@aws-sdk/client-s3";
import { ConnectionPool } from "./connection-pool";
import logger from "../services/logger";

/**
 * DEPRECATED: Use getS3Client() instead
 * 
 * This creates a new client every time. For production use with
 * connection pooling, use ConnectionPool.getS3Client()
 */
export function createS3Client(): S3Client {
  logger.warn(
    "createS3Client() is deprecated. Use ConnectionPool.getS3Client() instead."
  );
  return ConnectionPool.getS3Client();
}

/**
 * Get pooled S3 client
 * Reuses connections for Beanstalk deployment
 * Safe for Lambda (new instance per invocation)
 */
export function getS3Client(): S3Client {
  return ConnectionPool.getS3Client();
}

export default { createS3Client, getS3Client };
