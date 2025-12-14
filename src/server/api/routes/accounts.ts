import { Router } from "express";
import { AccountController } from "../controllers/AccountController.js";

const router = Router();

// /v1/accounts
router.get("/", AccountController.getAll);
router.post("/", AccountController.addAccount); // Replaces login
router.post("/switch", AccountController.switchAccount); // Select account to chat
router.delete("/:id", AccountController.removeAccount);

export default router;
