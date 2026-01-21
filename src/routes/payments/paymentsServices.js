// services/payments.service.js
import pool from "../../db.js";
import mercadopago from "../../config/mercadopago.js";

export const createMpPreferenceService = async (userId, orderId) => {

    //Validar pedido
    const { rows: orders } = await pool.query(
        `SELECT * FROM orders
         WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
        [orderId, userId]
    );

    if (!orders.length) {
        throw new Error("Pedido inválido o no disponible");
    }

    const order = orders[0];

    //Obtener items del pedido
    const { rows: items } = await pool.query(
        `SELECT product_name, price, quantity
         FROM order_items
         WHERE order_id = $1`,
        [orderId]
    );

    //Construir preferencia
    const preference = {
        items: items.map(i => ({
            title: i.product_name,
            unit_price: Number(i.price),
            quantity: i.quantity
        })),
        external_reference: order.id.toString(),
        back_urls: {
            success: `${process.env.FRONT_URL}/pago/exito`,
            failure: `${process.env.FRONT_URL}/pago/error`,
            pending: `${process.env.FRONT_URL}/pago/pendiente`
        },
        auto_return: "approved",
        notification_url: "https://TU_BACKEND.com/api/webhooks/mercadopago"
    };

    // 4️⃣ Crear preferencia en MP
    const response = await mercadopago.preferences.create(preference);

    return {
        init_point: response.body.init_point,
        sandbox_init_point: response.body.sandbox_init_point
    };
};
