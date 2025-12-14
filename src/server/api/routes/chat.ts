import { Router } from "express";
import { ChatController } from "../controllers/ChatController.js";

const router = Router();

// /v1/chat
router.post("/select-account", ChatController.selectAccount); // Endpoint to select account
router.post("/", ChatController.sendMessage); // Send message

router.post("/new", ChatController.newConversation); // Start new conversation (clear context)
router.get("/:conversationId", ChatController.getHistory); // Get conversation history

export default router;
