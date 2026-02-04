import { mpPayment } from "../../config/mercadopago.js";
import pool from "../../db.js";

export const handleMpWebhookService = async (paymentId) => {

    //Consultar pago real en MP
    const paymentResponse = await mpPayment.get({
        id: paymentId
    });

    const payment = paymentResponse.body;

    const orderId = payment.external_reference;
    if (!orderId) return;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Obtener pedido
        const { rows: orders } = await client.query(
            `SELECT id, total_amount, currency, status
             FROM orders
             WHERE id = $1`,
            [orderId]
        );

        if (!orders.length) {
            throw new Error("Pedido no existe");
        }

        const order = orders[0];

        //Validar monto y moneda
        if (
            Number(payment.transaction_amount) !== Number(order.total_amount) ||
            payment.currency_id !== order.currency
        ) {
            throw new Error("Monto o moneda no coinciden");
        }

        //Verificar pago duplicado
        const { rows: existing } = await client.query(
            `SELECT id FROM payments
             WHERE provider = 'mercadopago'
             AND provider_payment_id = $1`,
            [payment.id]
        );

        if (existing.length) {
            await client.query("ROLLBACK");
            return; // webhook repetido, salimos tranquilos
        }

        //Guardar pago
        await client.query(
            `INSERT INTO payments
             (order_id, provider, provider_payment_id, status, amount, currency, raw_response)
             VALUES ($1, 'mercadopago', $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [
                orderId,
                payment.id,
                payment.status,
                payment.transaction_amount,
                payment.currency_id,
                payment
            ]
        );

        //Actualizar pedido (solo si no está paid)
        if (order.status !== "paid") {
            if (payment.status === "approved") {
                await client.query(
                    `UPDATE orders SET status = 'paid' WHERE id = $1`,
                    [orderId]
                );
            } else if (payment.status === "rejected") {
                await client.query(
                    `UPDATE orders SET status = 'failed' WHERE id = $1`,
                    [orderId]
                );
            }
        }

        await client.query("COMMIT");



    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
