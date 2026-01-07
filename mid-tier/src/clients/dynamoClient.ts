import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";


export function createDDBDocClient() {
  // Initialize DynamoDB Client and Document Client
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
  });
  return DynamoDBDocumentClient.from(client);
}

