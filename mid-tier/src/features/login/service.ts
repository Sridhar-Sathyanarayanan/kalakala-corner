import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDynamoDocumentClient } from "../../clients/dynamoClient";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import logger from "../../services/logger";

export async function verifyPassword(username: string, password: string) {
  try {
    logger.info("Login attempt", { username });
    const ddbDocClient = getDynamoDocumentClient();
    const params = {
      TableName: "app-config",
      Key: { username },
    };
    const command = new GetCommand(params);
    const data = await ddbDocClient.send(command);
    
    // Check if user exists
    if (!data.Item) {
      logger.warn("Login failed: User not found", { username });
      return { message: "User not found" };
    }
    
    // Compare password with stored bcrypt hash
    let match = false;
    try {
      match = await bcrypt.compare(password, data.Item?.password);
    } catch (bcryptErr) {
      logger.error("Password comparison failed", { error: (bcryptErr as any)?.message, username });
      return { message: "Internal server error" };
    }
    
    if (!match) {
      logger.warn("Login failed: Invalid password", { username });
      return { message: "Invalid password" };
    }
    
    // Generate JWT (expires in 30 minutes)
    const token = jwt.sign({ username }, process.env.ADMIN_TOKEN as string, {
      expiresIn: "30m",
    });
    logger.info("Login successful", { username });
    return { message: "Login successful", token };
  } catch (err) {
    logger.error("Login error", { error: (err as any)?.message, username });
    return { message: "Internal server error" };
  }
}

export async function checkLoggedIn(token: string) {
  return jwt.verify(token, process.env.ADMIN_TOKEN as string);
}
