import { Router } from "express";
import { ChatController } from "../controllers/ChatController.js";

const router = Router();

// /v1/chat
router.post("/select-account", ChatController.selectAccount); // Endpoint to select account
router.post("/", ChatController.sendMessage); // Send message

// Future: Add history, etc if needed as per user request (d/ gửi req cho account đó để chat)

export default router;
