// routes/webhooks.routes.js
import { Router } from "express";
import { mercadopagoWebhook } from "./webhooksController.js";

const router = Router();

router.post("/mercadopago", mercadopagoWebhook);

export default router;
