/**
 * Database Connection Pool
 * 
 * Provides singleton pattern for DynamoDB and S3 clients.
 * 
 * AWS Lambda: Creates new clients per invocation (stateless)
 * Beanstalk: Reuses clients across requests (connection pooling)
 * 
 * This abstraction works for both environments.
 */

import {
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import logger from "../services/logger";

/**
 * DynamoDB Connection Pool
 */
class DynamoDBConnectionPool {
  private static instance: DynamoDBConnectionPool;
  private dynamoClient: DynamoDBClient | null = null;
  private documentClient: DynamoDBDocumentClient | null = null;
  private isInitialized = false;

  /**
   * Get singleton instance
   */
  static getInstance(): DynamoDBConnectionPool {
    if (!DynamoDBConnectionPool.instance) {
      DynamoDBConnectionPool.instance = new DynamoDBConnectionPool();
    }
    return DynamoDBConnectionPool.instance;
  }

  /**
   * Initialize DynamoDB clients
   */
  private initializeDynamoDB(): void {
    if (this.isInitialized && this.documentClient) {
      return;
    }

    try {
      const dynamoConfig: DynamoDBClientConfig = {
        region: process.env.AWS_REGION || "us-east-1",
      };

      this.dynamoClient = new DynamoDBClient(dynamoConfig);

      const docClientConfig = {
        marshallOptions: {
          removeUndefinedValues: true,
        },
      };

      this.documentClient = DynamoDBDocumentClient.from(
        this.dynamoClient,
        docClientConfig
      );

      this.isInitialized = true;
      logger.info("DynamoDB connection pool initialized");
    } catch (error) {
      logger.error("Failed to initialize DynamoDB connection pool", error);
      throw error;
    }
  }

  /**
   * Get DynamoDB client
   */
  getDynamoClient(): DynamoDBClient {
    if (!this.dynamoClient) {
      this.initializeDynamoDB();
    }
    return this.dynamoClient!;
  }

  /**
   * Get DynamoDB Document client
   */
  getDocumentClient(): DynamoDBDocumentClient {
    if (!this.documentClient) {
      this.initializeDynamoDB();
    }
    return this.documentClient!;
  }

  /**
   * Close connections (useful for Beanstalk graceful shutdown)
   */
  async close(): Promise<void> {
    if (this.dynamoClient) {
      await this.dynamoClient.destroy();
      logger.info("DynamoDB client connection closed");
    }
  }

  /**
   * Reset pool (useful for testing)
   */
  reset(): void {
    this.dynamoClient = null;
    this.documentClient = null;
    this.isInitialized = false;
  }
}

/**
 * S3 Connection Pool
 */
class S3ConnectionPool {
  private static instance: S3ConnectionPool;
  private s3Client: S3Client | null = null;
  private isInitialized = false;

  /**
   * Get singleton instance
   */
  static getInstance(): S3ConnectionPool {
    if (!S3ConnectionPool.instance) {
      S3ConnectionPool.instance = new S3ConnectionPool();
    }
    return S3ConnectionPool.instance;
  }

  /**
   * Initialize S3 client
   */
  private initializeS3(): void {
    if (this.isInitialized && this.s3Client) {
      return;
    }

    try {
      const s3Config: S3ClientConfig = {
        region: process.env.AWS_REGION || "us-east-1",
      };

      this.s3Client = new S3Client(s3Config);

      this.isInitialized = true;
      logger.info("S3 connection pool initialized");
    } catch (error) {
      logger.error("Failed to initialize S3 connection pool", error);
      throw error;
    }
  }

  /**
   * Get S3 client
   */
  getS3Client(): S3Client {
    if (!this.s3Client) {
      this.initializeS3();
    }
    return this.s3Client!;
  }

  /**
   * Close connection (useful for Beanstalk graceful shutdown)
   */
  async close(): Promise<void> {
    if (this.s3Client) {
      await this.s3Client.destroy();
      logger.info("S3 client connection closed");
    }
  }

  /**
   * Reset pool (useful for testing)
   */
  reset(): void {
    this.s3Client = null;
    this.isInitialized = false;
  }
}

/**
 * Global connection pool management
 */
export class ConnectionPool {
  /**
   * Get DynamoDB document client
   */
  static getDynamoDocumentClient(): DynamoDBDocumentClient {
    return DynamoDBConnectionPool.getInstance().getDocumentClient();
  }

  /**
   * Get DynamoDB client
   */
  static getDynamoClient(): DynamoDBClient {
    return DynamoDBConnectionPool.getInstance().getDynamoClient();
  }

  /**
   * Get S3 client
   */
  static getS3Client(): S3Client {
    return S3ConnectionPool.getInstance().getS3Client();
  }

  /**
   * Close all connections (call during graceful shutdown)
   */
  static async closeAll(): Promise<void> {
    await Promise.all([
      DynamoDBConnectionPool.getInstance().close(),
      S3ConnectionPool.getInstance().close(),
    ]);
    logger.info("All database connections closed");
  }

  /**
   * Reset all pools (useful for testing)
   */
  static resetAll(): void {
    DynamoDBConnectionPool.getInstance().reset();
    S3ConnectionPool.getInstance().reset();
  }
}

export default ConnectionPool;
