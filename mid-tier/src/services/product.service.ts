import { createDDBDocClient } from "../clients/dynamoClient";
import {
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import logger from "./logger";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createS3Client } from "../clients/s3Client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Response } from "express";

export async function getProducts() {
  try {
    const ddbDocClient = createDDBDocClient();
    const params = { TableName: "product-catalogue" };
    const command = new ScanCommand(params);
    const data = await ddbDocClient.send(command);
    return data.Items;
  } catch (error) {
    logger.error("Unable to fetch all data");
    throw error;
  }
}

export async function allProductsWithCategory(category: string) {
  try {
    const ddbDocClient = createDDBDocClient();
    const params = {
      TableName: "product-catalogue",
      FilterExpression: "#cat = :categoryValue",
      ExpressionAttributeNames: {
        "#cat": "category",
      },
      ExpressionAttributeValues: {
        ":categoryValue": category,
      },
    };
    const command = new ScanCommand(params);
    const data = await ddbDocClient.send(command);
    return data.Items;
  } catch (error) {
    logger.error("Unable to fetch data for category:", category);
    throw error;
  }
}

export async function getProduct(id: string) {
  try {
    const ddbDocClient = createDDBDocClient();
    const params = {
      TableName: "product-catalogue",
      Key: {
        id,
      },
    };
    const result = await ddbDocClient.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    logger.error("Unable to fetch all data");
    throw error;
  }
}

export async function addProduct(
  data: {
    name: string;
    desc: string;
    variants: object;
    id: string;
  },
  files: any
) {
  const imageUrls: string[] = [];
  const uuid = uuidv4();
  // Upload each image to S3
  for (const file of files as Express.Multer.File[]) {
    const fileKey = `${uuid}/${file.originalname}`;
    const s3 = createS3Client();
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: "public-read",
        })
      );
      imageUrls.push(
        `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`
      );
    } catch (err) {
      logger.error(`Unable to post to s3 bucket`, err);
    }
  }
  const ddbDocClient = createDDBDocClient();
  const params = {
    TableName: "product-catalogue",
    Item: {
      ...data,
      id: uuid,
      images: imageUrls,
      createdAt: new Date().toISOString(),
    },
  };
  try {
    return await ddbDocClient.send(new PutCommand(params));
  } catch (err) {
    logger.error(`Unable to insert data ${data}`);
    throw err;
  }
}

/** Upload a file to S3 and return its URL */
async function uploadFileToS3(
  s3: S3Client,
  id: string,
  file: Express.Multer.File
) {
  const key = `${id}/${file.originalname}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    })
  );
  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/** Delete a file from S3 by URL */
async function deleteS3File(s3: S3Client, url: string) {
  try {
    const bucketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    const key = url.replace(bucketUrl, "");
    await s3.send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key })
    );
  } catch (err) {
    logger.error(`Failed to delete S3 file ${url}`, err);
  }
}


/** Express handler for updating a product */
export async function updateProduct(
  id: string,
  data: any,
  files?: Express.Multer.File[]
) {
  const { name, desc, variants, existingImages,category, notes } = data;

  const s3 = createS3Client();
  const ddb = createDDBDocClient();

  try {
    // 1️⃣ Fetch existing product
    const existingProduct = await ddb.send(
      new GetCommand({ TableName: "product-catalogue", Key: { id } })
    );
    const oldImages: string[] = existingProduct?.Item?.images || [];

    // 2️⃣ Parse retained existing images
    const retainedImages: string[] = existingImages
      ? JSON.parse(existingImages)
      : [];

    // 3️⃣ Delete removed images from S3
    const removedImages = oldImages.filter(
      (url) => !retainedImages.includes(url)
    );
    await Promise.all(removedImages.map((url) => deleteS3File(s3, url)));

    // 4️⃣ Upload new images to S3
    const newImageUrls: string[] = [];
    for (const file of files as Express.Multer.File[]) {
      const url = await uploadFileToS3(s3, id, file);
      newImageUrls.push(url);
    }

    // 5️⃣ Merge retained + new images
    const finalImages = [...retainedImages, ...newImageUrls];

    // 6️⃣ Update DynamoDB
    const updatedProduct = await ddb.send(
      new UpdateCommand({
        TableName: "product-catalogue",
        Key: { id },
        UpdateExpression: `
          SET #name = :name,
              #desc = :desc,
              #variants = :variants,
              #images = :images,
              #notes = :notes,
              #category = :category,
              #updatedAt = :updatedAt
        `,
        ExpressionAttributeNames: {
          "#name": "name",
          "#desc": "desc",
          "#variants": "variants",
          "#images": "images",
          "#category": "category",
          "#notes": "notes",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":name": name,
          ":desc": desc,
          ":variants": variants,
          ":images": finalImages,
          ":category": category,
          ":notes": notes,
          ":updatedAt": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return updatedProduct.Attributes;
  } catch (err) {
    logger.error(`Failed to update product ${id}`, err);
    throw err;
  }
}
export async function deleteProduct(id: string) {
  const item = await getProduct(id);
  const s3 = createS3Client();
  await Promise.all(item?.images.map((url: string) => deleteS3File(s3, url)));
  const ddb = createDDBDocClient();
  const params = {
    TableName: "product-catalogue",
    Key: {
      id,
    },
  };
  try {
    await ddb.send(new DeleteCommand(params));
    return { message: "Product deleted successfully" };
  } catch (err) {
    logger.error("Failed to delete item:", err);
    throw err;
  }
}

export async function downloadCatalogue(
  res: Response<any, Record<string, any>>
) {
  try {
    const ddbDocClient = createDDBDocClient();
    const params = { TableName: "product-catalogue" };
    const command = new ScanCommand(params);
    const data = await ddbDocClient.send(command);
    return data.Items;
  } catch (error) {
    logger.error("Unable to fetch catalogue data", error);

    // If headers not already sent by pipe
    if (!res.headersSent) {
      res.status(500).send("Failed to generate PDF");
    }
  }
}

/** Stream an object from S3 to the express response given a full S3 URL */
export async function fetchImageFromS3(url: string, res: Response) {
  try {
    const bucketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    if (!url.startsWith(bucketUrl)) {
      // For security, only allow serving from configured bucket
      res.status(400).send({ message: "Invalid S3 URL" });
      return;
    }

    const key = url.replace(bucketUrl, "");
    const s3 = createS3Client();
    const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key });
    const result = await s3.send(command);

    // Set headers
    const contentType = (result.ContentType as string) || "application/octet-stream";
    if (result.ContentLength) res.setHeader("Content-Length", String(result.ContentLength));
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");

    // Stream body
    const body = result.Body as any;
    if (body && typeof body.pipe === "function") {
      body.pipe(res);
    } else if (body && body instanceof Uint8Array) {
      res.send(Buffer.from(body));
    } else {
      // Fallback: return 404
      res.status(404).send({ message: "No image body" });
    }
  } catch (err) {
    logger.error("Failed to fetch image from S3", err);
    res.status(500).send({ message: "Failed to fetch image" });
  }
}
