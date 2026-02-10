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

        for(const order of orders){
            const { rows: address} = await pool.query(
                `SELECT * from addresses WHERE id = $1`,[orders.address_id]
            );

            order.address = address[0];
        };

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

        for(const order of orders){
            const { rows: address} = await pool.query(
                `SELECT * from addresses WHERE id = $1`,[orders.address_id]
            );

            order.address = address[0];
        };

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

router.post("/updateOrderAddress/:orderId", authMiddleware, async (req,res) => {
    const orderId = req.params.orderId;
    const addressId = req.body.id;
    const userId = req.user.id;

    try{

        const {rows:address} = await pool.query(
            "SELECT * FROM addresses WHERE id = $1",
            [addressId]
        );

        if(address.length === 0){
            throw new Error("No existe la direccion");
        }

        await pool.query(
            "UPDATE orders SET address_id = $1 WHERE id = $2 AND user_id = $3",
            [address[0].id, orderId, userId]
        )

        res.status(200).json({message: "Direccion actualizada correctamente"});
    }catch(error){
        console.error(error);
        res.status(500).json({error: "Error del servidor al actualizar la direccion de la orden"});
    }
});

router.put("/canceled-order/:orderId", authMiddleware, async (req,res) => {
    const orderId = req.params.orderId;

    try{
        if(!orderId){
            throw new Error("Id no existente");
        }

        const {rows} = await pool.query(
            "SELECT * FROM orders WHERE id = $1",
            [orderId]
        )

        if(rows.length === 0){
            throw new Error("La orden no existe");
        }

        await pool.query(
            "UPDATE orders SET status = 'canceled' WHERE id = $1",
            [rows[0].id]
        );

        res.sendStatus(200);
    }catch(error){
        console.log(error);
        res.status(500).json({error : "Error del servidor al cancelar orden"});
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

        const { rows: address} = await pool.query(
            `SELECT * from addresses WHERE id = $1`,[rows[0].address_id]
        );

        if(address.length === 0){
          return res.status(404).json({error: "Direccion no existente"});  
        };

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

        const addressOrder = address[0];

        res.json({ ...rows[0], items, address:addressOrder });
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
