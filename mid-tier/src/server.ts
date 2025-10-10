// server.ts
import express, { Request, Response } from "express";
import cors from "cors";
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

app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("OK");
});

// Root route
app.get("/", (req, res) => {
  res.send("It Works!!");
});

import productRoutes from "./routes/products.routes";
import loginRoutes from "./routes/login.routes";
app.use(productRoutes);
app.use(loginRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at ${port}`);
});
