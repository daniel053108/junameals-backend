// services/payments.service.js
import pool from "../../db.js";
import { mpPreference }  from "../../config/mercadopago.js";

export const createMpPreferenceService = async (user, orderId) => {

    //Validar pedido
    const { rows: orders } = await pool.query(
        `SELECT * FROM orders
         WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
        [orderId, user.id]
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
        payment_methods: {
            excluded_payment_types: [
                { id: "ticket" },        
                { id: "atm" },           
                { id: "bank_transfer" }  
            ],
            installments: 1
            },
        back_urls: {
            success: `${process.env.FRONTEND_URL}/payment/success`,
            failure: `${process.env.FRONTEND_URL}/payment/error`,
            pending: `${process.env.FRONTEND_URL}/payment/pending?orderId=${orderId}`
        },
        payer:{
            email: user.email
        },
        statement_descriptor: "JUNAMEALS",
        notification_url: `${process.env.BACKEND_URL}/api/webhooks/mercadopago`,
        auto_return: "approved"
    };
    //Crear preferencia en MP
    const response = await mpPreference.create({body:preference});
    return {
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point
    };
};
