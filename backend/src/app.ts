import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import cors from "cors";
import invoicesRoutes from "./modules/invoices/invoices.routes";
import suppliersRoutes from "./modules/suppliers/suppliers.routes";
import uploadsRoutes from "./modules/uploads/uploads.routes";
import documentsRoutes from "./modules/documents/documents.routes";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/invoices", invoicesRoutes);
app.use("/suppliers", suppliersRoutes);
app.use("/uploads", uploadsRoutes);
app.use("/documents", documentsRoutes);

export default app;
