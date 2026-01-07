import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { listSuppliers } from "./suppliers.controller";

const router = Router();

router.get("/", authMiddleware, listSuppliers);

export default router;
