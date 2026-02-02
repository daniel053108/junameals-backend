import authMiddleware from "../../middlewares/authMiddleware.js";
import { createOrderService } from "./ordersService.js";
import express from "express";
import pool from "../../db.js"

const router = express.Router();

router.post("/createOrder", authMiddleware, async (req,res) => {
    const userId = req.user.id;
    const {items} = req.body;
    
    try{
        if(!items || !items.length){
            return res.status(400).json({error: "Carrito vacio"});
        }
    
        const order = await createOrderService(userId, items);

        res.status(201).json(order);
    }catch(error){
        return res.status(500).json({error: error.message });
    }
});

router.get("/getMyOrders", authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const { rows: orders } = await pool.query(
            `
            SELECT *
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [userId]
        );

        for (const order of orders) {
            const { rows: items } = await pool.query(
                `
                SELECT 
                    oi.id,
                    oi.product_id,
                    oi.product_name,
                    oi.price,
                    oi.quantity,
                    oi.created_at,
                    p.image AS product_image
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = $1
                `,
                [order.id]
            );

            order.items = items;
        }

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener órdenes" });
    }
});

router.get("/getOrders", authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const { rows: orders } = await pool.query(
            `
            SELECT *
            FROM orders
            ORDER BY created_at DESC
            `,
        );

        for (const order of orders) {
            const { rows: items } = await pool.query(
                `
                SELECT 
                    oi.id,
                    oi.product_id,
                    oi.product_name,
                    oi.price,
                    oi.quantity,
                    oi.created_at,
                    p.image AS product_image
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = $1
                `,
                [order.id]
            );

            order.items = items;
        }

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener órdenes" });
    }
});

router.put("/updateStatusOrder/:orderId", authMiddleware, async (req,res) => {
    const { orderId } = req.params;
    try{
        if(!orderId)return res.status(400).json({error: "La orden no existe"});

        const { rows: orden } = await pool.query(
            "SELECT * FROM orders WHERE id = $1",
            [orderId]
        )
        
        if(orden.length === 0){
            return res.status(400).json({error: "La orden no existe"});
        }

        const orderStatus = orden[0].status_delivery;
        let newStatus;

        if(orderStatus === "pending") 
            newStatus = "arriving";
        else if(orderStatus === "arriving")
            newStatus = "delivered";
        else if(orderStatus === "delivered")
            newStatus = "pending";

        await pool.query(
            "UPDATE orders SET status_delivery = $1 WHERE id = $2",
            [newStatus,orderId]
        )

        res.status(200).json({message: "Estatus actualizado correctamente"});
    }catch(error){
        res.status(500).json({error : "Error al cambiar el estatus de la orden"});
        console.error(error);
    }
});

router.get("/:orderId", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { orderId } = req.params;

    try {
        const { rows } = await pool.query(
            `
            SELECT *
            FROM orders
            WHERE id = $1 AND user_id = $2
            `,
            [orderId, userId]
        );

        if (!rows.length) {
            return res.status(404).json({ message: "Pedido no encontrado" });
        }

        const { rows: items } = await pool.query(
            `
            SELECT 
                oi.id,
                oi.product_id,
                oi.product_name,
                oi.price,
                oi.quantity,
                oi.created_at,
                p.image AS product_image
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = $1
            `,
            [orderId]
        );

        res.json({ ...rows[0], items });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener la orden" });
    }
});


router.get("/:orderId/status", authMiddleware, async (req,res) => {
   const userId = req.user.id;
    const { orderId } = req.params;

    const { rows } = await pool.query(
        `SELECT *
         FROM orders
         WHERE id = $1 AND user_id = $2`,
        [orderId, userId]
    );

    if (!rows.length) {
        return res.status(404).json({ message: "Pedido no encontrado" });
    }

    res.json({ status: rows.status});
});

export default router;
