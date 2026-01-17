/**
 * Enquiries Controller
 * Handles customer enquiries and support requests
 */

import logger from "../../services/logger";
import { addCustomerEnquiries, enquiriesList } from "./service";
import { BaseController, ControllerResponse } from "../base.controller";

/**
 * Enquiries Controller
 * Manages customer enquiries and queries
 */
export class EnquiriesController extends BaseController {
  /**
   * Create a new customer enquiry
   */
  async createEnquiry(enquiryData: any): Promise<ControllerResponse> {
    try {
      // Validate required fields
      if (!enquiryData) {
        logger.warn("Enquiry data missing");
        return this.badRequest("Enquiry data is required");
      }

      const { name, email, phone, query, product } = enquiryData;

      // Validate essential fields
      if (!name || !email || !phone || !query) {
        logger.warn("Required enquiry fields missing");
        return this.badRequest("Name, email, phone, and query are required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        logger.warn("Invalid email format");
        return this.badRequest("Invalid email format");
      }

      // Validate phone format
      const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;
      if (!phoneRegex.test(phone.toString())) {
        logger.warn("Invalid phone number");
        return this.badRequest("Invalid phone number");
      }

      logger.info(`Creating customer enquiry from: ${name} (${email})`);

      const enquiry = {
        name,
        email,
        phone: parseInt(phone as string),
        query,
        product: product || null,
      };

      const result = await addCustomerEnquiries(enquiry);

      logger.info(`Enquiry created successfully for: ${name}`);
      return this.created({
        message: "Enquiry submitted successfully",
        confirmationEmail: email,
        data: result,
      });
    } catch (error) {
      logger.error("Error creating enquiry", error);
      return this.serverError("Failed to submit enquiry");
    }
  }

  /**
   * Get all customer enquiries (admin only)
   */
  async getEnquiriesList(): Promise<ControllerResponse> {
    try {
      logger.info("Fetching all customer enquiries");

      const enquiries = await enquiriesList();

      if (!enquiries || enquiries.length === 0) {
        logger.info("No enquiries found");
        return this.success({ items: [] });
      }

      logger.info(`Retrieved ${enquiries.length} enquiries`);
      return this.success({ items: enquiries });
    } catch (error) {
      logger.error("Error fetching enquiries", error);
      return this.serverError("Failed to fetch enquiries");
    }
  }
}

// Export singleton instance
export const enquiriesController = new EnquiriesController();
