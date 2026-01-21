import { handleMpWebhookService } from "./webhooksService.js";

export const mercadopagoWebhook = async (req, res) => {
    try {
        await handleMpWebhookService(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error("Webhook error:", error);
        res.sendStatus(500);
    }
};
