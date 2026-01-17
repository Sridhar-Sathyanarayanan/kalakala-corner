import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { getDynamoDocumentClient } from "../../clients/dynamoClient";
import logger from "../../services/logger";
import { getConfig } from "../../lambda/core/config";

function getTableName(): string {
  try {
    return getConfig().tables.enquiries;
  } catch {
    return "customer-enquiries"; // fallback for backward compatibility
  }
}

export async function addCustomerEnquiries(args: {
  name: string;
  email: string;
  phone: number;
  query: string;
  product: string;
}) {
  try {
    const ddbDocClient = getDynamoDocumentClient();
    const params = {
      TableName: getTableName(),
      Item: {
        ...args,
        id: randomUUID(),
        date: new Date().toISOString(),
      },
    };
    return await ddbDocClient.send(new PutCommand(params));
  } catch (error) {
    logger.error("Unable to fetch all data");
    throw error;
  }
}

export async function enquiriesList() {
  const ddbDocClient = getDynamoDocumentClient();
  const params = { TableName: getTableName() };
  const data = await ddbDocClient.send(new ScanCommand(params));
  return data.Items;
}
