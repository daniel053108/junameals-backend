// webhooksService.js
import { mpPayment } from "../../config/mercadopago.js";
import pool from "../../db.js";

export const handleMpWebhookService = async (paymentId) => {
    let payment;

    try {
        // En la SDK v2, el resultado es directamente el objeto del pago
        payment = await mpPayment.get({ id: paymentId });
    } catch (error) {
        if (error?.status === 404) return;
        throw error;
    }

    // Extraer datos necesarios
    const orderId = payment.external_reference;
    const { status, transaction_amount, currency_id, id: providerId } = payment;

    if (!orderId) {
        console.warn(`El pago ${paymentId} no tiene external_reference (orderId).`);
        return;
    }

    const dbClient = await pool.connect();

    try {
        await dbClient.query("BEGIN");

        // 1. Obtener y bloquear la fila del pedido para evitar condiciones de carrera
        const { rows: orders } = await dbClient.query(
            `SELECT id, total_amount, currency, status FROM orders WHERE id = $1 FOR UPDATE`,
            [orderId]
        );

        if (!orders.length) throw new Error(`El pedido ${orderId} no existe en la base de datos.`);
        const order = orders[0];

        // 2. Validar integridad (Monto y Moneda)
        if (Number(transaction_amount) !== Number(order.total_amount) || currency_id !== order.currency) {
            throw new Error("Fraude detectado: El monto o la moneda no coinciden.");
        }

        // 3. Verificar si el pago ya fue registrado (Idempotencia)
        const { rows: existing } = await dbClient.query(
            `SELECT id FROM payments WHERE provider = 'mercadopago' AND provider_payment_id = $1`,
            [String(providerId)]
        );

        if (existing.length) {
            console.log(`Pago ${providerId} ya estaba procesado. Saltando...`);
            await dbClient.query("ROLLBACK");
            return;
        }

        // 4. Registrar el pago
        await dbClient.query(
            `INSERT INTO payments 
            (order_id, provider, provider_payment_id, status, amount, currency, raw_response)
            VALUES ($1, 'mercadopago', $2, $3, $4, $5, $6)`,
            [orderId, String(providerId), status, transaction_amount, currency_id, JSON.stringify(payment)]
        );

        // 5. Actualizar estado del pedido
        if (order.status !== "paid") {
            let newStatus = order.status;
            if (status === "approved") newStatus = "paid";
            else if (status === "rejected" || status === "cancelled") newStatus = "failed";

            if (newStatus !== order.status) {
                await dbClient.query(
                    `UPDATE orders SET status = $1 WHERE id = $2`,
                    [newStatus, orderId]
                );
                console.log(`Pedido ${orderId} actualizado a estado: ${newStatus}`);
            }
        }

        await dbClient.query("COMMIT");
        console.log(`Proceso completado con éxito para el pago ${paymentId}`);

    } catch (error) {
        await dbClient.query("ROLLBACK");
        console.error(`Error en la transacción del pago ${paymentId}:`, error.message);
        throw error;
    } finally {
        dbClient.release();
    }
};