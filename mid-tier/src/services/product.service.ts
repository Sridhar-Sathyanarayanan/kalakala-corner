import { createDDBDocClient } from "../clients/dynamoClient";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

export async function getProducts() {
  try {
    const ddbDocClient = createDDBDocClient();
    const params = { TableName: "product-catalogue" };
    const command = new ScanCommand(params);
    const data = await ddbDocClient.send(command);
    return data.Items;
  } catch (error) {
    console.error("Error scanning table:", error);
    throw error;
  }
}
