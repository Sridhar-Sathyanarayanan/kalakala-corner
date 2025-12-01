import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { createDDBDocClient } from "../clients/dynamoClient";
import logger from "./logger";

export async function addCustomerEnquiries(args: {
  name: string;
  email: string;
  phone: number;
  query: string;
  product: string;
}) {
  try {
    const ddbDocClient = createDDBDocClient();
    const params = {
      TableName: "customer-enquiries",
      Item: {
        ...args,
        id: uuidv4(),
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
  const ddbDocClient = createDDBDocClient();
  const params = { TableName: "customer-enquiries" };
  const data = await ddbDocClient.send(new ScanCommand(params));
  return data.Items;
}
