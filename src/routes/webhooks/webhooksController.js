import { handleMpWebhookService } from "./webhooksService.js";

export const mercadopagoWebhook = async (req, res) => {
    try {
        const paymentId =
            req.body?.data?.id ||
            req.query?.id;

        if (!paymentId) {
            return res.sendStatus(200);
        }

        await handleMpWebhookService(paymentId);
        res.sendStatus(200);
    } catch (error) {
        console.error("Webhook error:", error);
        res.sendStatus(500);
    }
};

