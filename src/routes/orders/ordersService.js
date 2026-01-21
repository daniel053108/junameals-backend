// services/orders.service.js
import pool from "../../db.js";

export const createOrderService = async (userId, items) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const productIds = items.map(i => i.productId);

        const { rows: products } = await client.query(
            `SELECT id, name, price
             FROM products
             WHERE id = ANY($1::int[])`,
            [productIds]
        );

        if (products.length !== items.length) {
            throw new Error("Producto inválido");
        }

        let total = 0;
        const itemsMap = {};

        items.forEach(i => itemsMap[i.productId] = i.quantity);

        products.forEach(p => {
            total += p.price * itemsMap[p.id];
        });

        const { rows: [order] } = await client.query(
            `INSERT INTO orders (user_id, total_amount, status)
             VALUES ($1, $2, 'pending')
             RETURNING *`,
            [userId, total]
        );

        for (const p of products) {
            await client.query(
                `INSERT INTO order_items
                 (order_id, product_id, product_name, price, quantity)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    order.id,
                    p.id,
                    p.name,
                    p.price,
                    itemsMap[p.id]
                ]
            );
        }

        await client.query("COMMIT");
        return order;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
