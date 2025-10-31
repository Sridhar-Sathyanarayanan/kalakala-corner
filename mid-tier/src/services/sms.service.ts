import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

import logger from "./logger";

const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendSMS(args: {
  name: string;
  email: string;
  phone: string;
  query: string;
  product?: string;
}) {
  try {
    const { name, email, phone, query, product } = args;
    const phoneNumbers = (process.env.ADMIN_PHONE_NUMBER || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    await Promise.all(
      phoneNumbers.map(async (num) => {
        const cmd = new PublishCommand({
          Message: `KalaKalaCorner enquiry: \n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n${
            product ? `Product: ${product}\n` : ""
          }Query: ${query}`,
          PhoneNumber: num,
          MessageAttributes: {
            "AWS.SNS.SMS.SMSType": {
              DataType: "String",
              StringValue: "Transactional",
            },
          },
        });
        const res = await snsClient.send(cmd);
        logger.info(`✅ Sent to ${num}: ${res.MessageId}`);
      })
    );
  } catch (error) {
    logger.info("❌ Error sending SMS:", error);
  }
}
