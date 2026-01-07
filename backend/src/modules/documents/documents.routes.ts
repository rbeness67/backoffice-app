import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { getDocumentDownloadUrl } from "./documents.controller";

const router = Router();

router.get("/:id/download-url", authMiddleware, getDocumentDownloadUrl);

export default router;
