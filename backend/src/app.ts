import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import cors from "cors";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/auth", authRoutes);

export default app;
