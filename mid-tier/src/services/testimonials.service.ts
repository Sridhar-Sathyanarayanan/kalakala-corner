import {
  DeleteCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { createDDBDocClient } from "../clients/dynamoClient";
import logger from "./logger";

const ddbDocClient = createDDBDocClient();

interface Testimonial {
  id: number;
  category: string;
  product: string;
  "product-id": string;
  comments: string;
  rating: number;
  updatedAt: string;
}

export async function getTestimonials() {
  try {
    const params = { TableName: "testimonials" };
    const command = new ScanCommand(params);
    const data = await ddbDocClient.send(command);
    return data.Items;
  } catch (error) {
    logger.error("Unable to fetch testimonials", error);
    throw error;
  }
}

export async function addTestimonial(testimonial: {
  category: string;
  product: string;
  "product-id": string;
  comments: string;
  rating: number;
}) {
  try {
    // Get the highest current ID and increment
    const existingTestimonials = await getTestimonials();
    const maxId = existingTestimonials && existingTestimonials.length > 0
      ? Math.max(...existingTestimonials.map((t: any) => t.id || 0))
      : 0;
    const newId = maxId + 1;

    const params = {
      TableName: "testimonials",
      Item: {
        id: newId,
        category: testimonial.category,
        product: testimonial.product,
        "product-id": testimonial["product-id"],
        comments: testimonial.comments,
        rating: testimonial.rating,
        updatedAt: new Date().toISOString(),
      },
    };

    await ddbDocClient.send(new PutCommand(params));
    return params.Item;
  } catch (error) {
    logger.error("Unable to add testimonial", error);
    throw error;
  }
}

export async function updateTestimonial(
  id: number,
  testimonial: {
    category?: string;
    product?: string;
    "product-id"?: string;
    comments?: string;
    rating?: number;
  }
) {
  try {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (testimonial.category !== undefined) {
      updateExpressions.push("#category = :category");
      expressionAttributeNames["#category"] = "category";
      expressionAttributeValues[":category"] = testimonial.category;
    }

    if (testimonial.product !== undefined) {
      updateExpressions.push("#product = :product");
      expressionAttributeNames["#product"] = "product";
      expressionAttributeValues[":product"] = testimonial.product;
    }

    if (testimonial["product-id"] !== undefined) {
      updateExpressions.push("#productId = :productId");
      expressionAttributeNames["#productId"] = "product-id";
      expressionAttributeValues[":productId"] = testimonial["product-id"];
    }

    if (testimonial.comments !== undefined) {
      updateExpressions.push("#comments = :comments");
      expressionAttributeNames["#comments"] = "comments";
      expressionAttributeValues[":comments"] = testimonial.comments;
    }

    if (testimonial.rating !== undefined) {
      updateExpressions.push("#rating = :rating");
      expressionAttributeNames["#rating"] = "rating";
      expressionAttributeValues[":rating"] = testimonial.rating;
    }

    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    const params = {
      TableName: "testimonials",
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW" as const,
    };

    const result = await ddbDocClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (error) {
    logger.error(`Unable to update testimonial with id ${id}`, error);
    throw error;
  }
}

export async function deleteTestimonial(id: number) {
  try {
    const params = {
      TableName: "testimonials",
      Key: { id },
    };

    await ddbDocClient.send(new DeleteCommand(params));
    return { message: "Testimonial deleted successfully" };
  } catch (error) {
    logger.error(`Unable to delete testimonial with id ${id}`, error);
    throw error;
  }
}
