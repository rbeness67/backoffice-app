import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { listInvoices, createInvoice, getNextInvoiceNumber,deleteInvoice,updateInvoice,getInvoiceDocuments } from "./invoices.controller";

const router = Router();

router.get("/", authMiddleware, listInvoices);
router.post("/", authMiddleware, createInvoice);
router.get("/next-number", authMiddleware, getNextInvoiceNumber);
router.delete("/:id", authMiddleware, deleteInvoice);
router.patch("/:id", authMiddleware, updateInvoice);
router.get("/:id/documents", authMiddleware, getInvoiceDocuments);

export default router;
