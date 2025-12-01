// server.ts
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import logger from "./services/logger";
if (process.env.ENVIRONMENT !== "production") {
  require("dotenv").config();
}
const app = express();
const port = process.env.PORT || 3000;

const corsOptions: cors.CorsOptions = {
  origin: process.env.ORIGIN,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
// Request logger (morgan → winston)
app.use(
  morgan("tiny", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);
app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("OK");
});

// Root route
app.get("/", (req, res) => {
  res.send("It Works!!");
});

import productRoutes from "./routes/products.routes";
import loginRoutes from "./routes/login.routes";
import mailRoutes from "./routes/mail.routes";
import customerEnquiryRoutes from "./routes/customer-enquiry.routes";
import testimonialsRoutes from "./routes/testimonials.routes";
app.use(productRoutes);
app.use(loginRoutes);
app.use(mailRoutes);
app.use(customerEnquiryRoutes);
app.use(testimonialsRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at ${port}`);
});
