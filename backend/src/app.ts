import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import cors from "cors";
import invoicesRoutes from "./modules/invoices/invoices.routes";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/invoices", invoicesRoutes);

export default app;
