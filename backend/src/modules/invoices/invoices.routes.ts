import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  listInvoices,
  getInvoiceDocuments,
  getNextInvoiceNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  downloadMonthDocumentsZip,
} from "./invoices.controller";

const router = Router();

// existing routes
router.get("/", authMiddleware, listInvoices);
router.get("/next-number", authMiddleware, getNextInvoiceNumber);
router.get("/:id/documents", authMiddleware, getInvoiceDocuments);
router.post("/", authMiddleware, createInvoice);
router.patch("/:id", authMiddleware, updateInvoice);
router.delete("/:id", authMiddleware, deleteInvoice);

// ✅ NEW ZIP route
router.get("/month/:monthKey/documents.zip", authMiddleware, downloadMonthDocumentsZip);

export default router;
