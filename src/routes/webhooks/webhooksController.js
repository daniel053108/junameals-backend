// routes/webhooks.js o donde tengas tu controlador
import { handleMpWebhookService } from "./webhooksService.js";

export const mercadopagoWebhook = async (req, res) => {
    // 1. Responder 200 inmediatamente. MP es impaciente.
    res.sendStatus(200);

    try {
        // En la v2, MP envía el tipo de evento en 'type' o 'topic'
        const type = req.body?.type || req.query?.topic;
        const paymentId = req.body?.data?.id || req.query?.id;

        // 2. Solo procesamos si es un evento de pago
        if (type === "payment" && paymentId) {
            console.log(`Webhook recibido: Procesando pago ${paymentId}...`);
            await handleMpWebhookService(paymentId);
        } else {
            console.log(`Webhook ignorado: Tipo de evento "${type}" no es de pago.`);
        }

    } catch (error) {
        // Solo logueamos el error, el 200 ya se envió para detener reintentos
        console.error("Webhook error:", error.message);
    }
};