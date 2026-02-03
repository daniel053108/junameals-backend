// services/payments.service.js
import pool from "../../db.js";
import MPpreference  from "../../config/mercadopago.js";

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
            success: `${process.env.FRONTEND_URL}/payment/success`,
            failure: `${process.env.FRONTEND_URL}/payment/error`,
            pending: `${process.env.FRONTEND_URL}/payment/pending?orderId=${orderId}`
        },
        notification_url: `${process.env.BACKEND_URL}/api/webhooks/mercadopago`,

        auto_return: "approved"
    };
    //Crear preferencia en MP
    const response = await MPpreference.create({body:preference});
    console.log(response)
    return {
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point
    };
};
