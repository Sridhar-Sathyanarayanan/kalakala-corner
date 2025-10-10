import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createDDBDocClient } from "../clients/dynamoClient";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

export async function verifyPassword(username: string, password: string) {
  try {
    const ddbDocClient = createDDBDocClient();
    const params = {
      TableName: "app-config",
      Key: { username },
    };
    const command = new GetCommand(params);
    const data = await ddbDocClient.send(command);
    // Compare password with stored bcrypt hash
    if (!data.Item) {
      return { message: "User not found" };
    }
    const match = await bcrypt.compare(password, data.Item?.password);
    if (!match) {
      return { message: "Invalid password" };
    }
    // Generate JWT (expires in 30 minutes)
    const token = jwt.sign({ username }, process.env.ADMIN_TOKEN as string, {
      expiresIn: "30m",
    });
    return { message: "Login successful", token };
  } catch (err) {
    console.error("Error verifying password:", err);
    return { message: "Internal server error" };
  }
}

export async function checkLoggedIn(token:string){
  return jwt.verify(token, process.env.ADMIN_TOKEN as string);
}
