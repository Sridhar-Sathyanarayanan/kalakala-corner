import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const sendEmail = async (args: {
  name: any;
  email: any;
  phone: any;
  query: any;
  product: any;
}) => {
  const { name, email, phone, query, product } = args;

  const bodyText = `
        Name: ${name}
        Email: ${email}
        Phone: ${phone}
        Message:${query}`;
  const command = new SendEmailCommand({
    Destination: { ToAddresses: ["rsk.sudha@gmail.com"] },
    Message: {
      Body: { Text: { Data: bodyText } },
      Subject: {
        Data: `${product ? "Product" : "General"} Query from ${name} ${
          product ? " about " + product : ""
        }`,
      },
    },
    Source: "rsk.sudha@gmail.com",
  });
  return sesClient.send(command);
};
