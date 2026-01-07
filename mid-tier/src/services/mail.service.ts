import Mailjet from "node-mailjet";
import { addCustomerEnquiries } from "./customer-enquiries.service";
import logger from "./logger";

const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY as string,
  process.env.MAILJET_API_SECRET as string
);

export async function sendEmail(args: {
  name: string;
  email: string;
  phone: number;
  query: string;
  product: string;
}) {
  try {
    const { name, email, phone, query, product } = args;
    await addCustomerEnquiries(args);
    const recipients = (process.env.RECIPIENT_EMAIL || "")
      .split(",")
      .map((email) => ({ Email: email.trim() }));
    await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.SENDER_EMAIL as string,
            Name: "Kalakala-Corner",
          },
          To: recipients,
          Subject: "New Query From Kalakala Corner",
          HTMLPart: `
  <div style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 20px;">
      <h2 style="color: #333333; text-align: center;">📩 New Enquiry for <span style="color:#007BFF;">KalaKalaCorner</span></h2>
      <hr style="border: 0; border-top: 2px solid #007BFF; width: 60px; margin: 10px auto;">
      
      <p style="font-size: 16px; color: #555;">You’ve received a new enquiry. Details are as follows:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr>
          <td style="padding: 8px; font-weight: bold; color: #333;">Name:</td>
          <td style="padding: 8px; color: #555;">${name}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 8px; font-weight: bold; color: #333;">Email:</td>
          <td style="padding: 8px; color: #555;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; color: #333;">Phone:</td>
          <td style="padding: 8px; color: #555;">${phone}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 8px; font-weight: bold; color: #333;">Query:</td>
          <td style="padding: 8px; color: #555;">${query}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; color: #333;">Product:</td>
          <td style="padding: 8px; color: #555;">${product}</td>
        </tr>
      </table>
      
      <p style="margin-top: 25px; font-size: 14px; color: #777; text-align: center;">
        — Sent automatically by <strong>KalaKalaCorner</strong> Website —
      </p>
    </div>
  </div>
`,
        },
      ],
    });
    logger.info("✅ Email sent successfully!");
  } catch (error: any) {
    logger.error("❌ Error sending email:", error);
    throw error;
  }
}
