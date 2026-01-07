import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { presignUpload } from "./uploads.controller";

const router = Router();

router.post("/presign", authMiddleware, presignUpload);

export default router;
