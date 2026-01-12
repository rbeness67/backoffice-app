import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import cors from "cors";
import invoicesRoutes from "./modules/invoices/invoices.routes";
import suppliersRoutes from "./modules/suppliers/suppliers.routes";
import uploadsRoutes from "./modules/uploads/uploads.routes";
import documentsRoutes from "./modules/documents/documents.routes";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://backoffice-app-flame.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // autorise Postman / curl
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ✅ utile
app.use("/auth", authRoutes);
app.use("/invoices", invoicesRoutes);
app.use("/suppliers", suppliersRoutes);
app.use("/uploads", uploadsRoutes);
app.use("/documents", documentsRoutes);

export default app;
