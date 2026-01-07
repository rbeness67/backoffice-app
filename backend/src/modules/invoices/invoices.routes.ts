import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { listInvoices } from "./invoices.controller";

const router = Router();

router.get("/", authMiddleware, listInvoices);

export default router;
