/**
 * Centralized configuration management
 */

export interface LambdaConfig {
  environment: "dev" | "staging" | "prod";
  region: string;
  corsOrigin: string;
  adminTokenSecret: string;
  logLevel: "debug" | "info" | "warn" | "error";
  enableXRay: boolean;
  enableDetailedErrors: boolean;
  requestTimeout: number;
  maxRequestSize: number;
  tables: {
    products: string;
    testimonials: string;
    enquiries: string;
    categories: string;
  };
  s3Buckets: {
    primary: string;
  };
}

/**
 * Configuration loader with validation
 */
class ConfigurationManager {
  private config: LambdaConfig | null = null;

  /**
   * Load and validate configuration
   */
  load(): LambdaConfig {
    if (this.config) {
      return this.config;
    }

    const environment = (process.env.ENVIRONMENT || "dev") as "dev" | "staging" | "prod";
    const adminTokenSecret = process.env.ADMIN_TOKEN;

    if (!adminTokenSecret) {
      throw new Error("ADMIN_TOKEN environment variable is not set");
    }

    this.config = {
      environment,
      region: process.env.AWS_REGION || "us-east-1",
      corsOrigin: process.env.CORS_ORIGIN || "*",
      adminTokenSecret,
      logLevel: (process.env.LOG_LEVEL || "info") as any,
      enableXRay: process.env.ENABLE_XRAY === "true",
      enableDetailedErrors: environment !== "prod",
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "30000"),
      maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || "10485760"), // 10MB
      tables: {
        products: "product-catalogue",
        testimonials: "testimonials",
        enquiries: "customer-enquiries",
        categories: "product-categories",
      },
      s3Buckets: {
        primary: process.env.S3_BUCKET || `kalakala-corner-${environment}`,
      },
    };

    return this.config;
  }

  /**
   * Get configuration (load if not already loaded)
   */
  get(): LambdaConfig {
    return this.load();
  }

  /**
   * Reset configuration (useful for testing)
   */
  reset(): void {
    this.config = null;
  }

  /**
   * Check if environment is production
   */
  isProduction(): boolean {
    return this.load().environment === "prod";
  }

  /**
   * Check if environment is development
   */
  isDevelopment(): boolean {
    return this.load().environment === "dev";
  }
}

// Singleton instance
export const configManager = new ConfigurationManager();

/**
 * Helper to get config
 */
export const getConfig = (): LambdaConfig => configManager.get();
