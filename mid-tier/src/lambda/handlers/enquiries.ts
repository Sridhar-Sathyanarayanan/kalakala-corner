/**
 * Consolidated Enquiries Handlers
 * All customer enquiries-related Lambda handlers in one file
 */

import { enquiriesList } from "../../features/enquiries/service";
import { HandlerFactory, HandlerContext } from "../core/handler-factory";

/**
 * GET /enquiries-list
 * Fetch all customer enquiries (admin only)
 */
export const getEnquiries = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const enquiries = await enquiriesList();
    return context.response.success(enquiries);
  }
);
