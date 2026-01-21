import authMiddleware from "../../middlewares/authMiddleware.js";
import { createOrderService } from "./ordersService.js";
import express from "express";

const router = express.Router();

router.post("/", authMiddleware, async (req,res) => {
    const userId = req.user.id;
    const { items } = req.body;
 
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

router.get("/getMyOrders", authMiddleware, async (req,res) => {
    const userId = req.user.id;

    const { rows } = await pool.query(
        `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
    )

    res.status(200).json(rows);
});

router.get("/getOrderById/:id",authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const { rows } = await pool.query(
        `SELECT *
         FROM orders
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
    );

    if (!rows.length) {
        return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const { rows: items } = await pool.query(
        `SELECT *
         FROM order_items
         WHERE order_id = $1`,
        [id]
    );

    res.json({ ...rows[0], items });
});

export default router;
