import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import pool from "../../db.js";

const router = express.Router();

router.get("/", authMiddleware, async (req,res) => {
    if (!req.user) {
        return res.status(401).json({ error: "No autorizado" });
    }

    const loggedUser = req.user;
    
    const existCart = await pool.query(
        "SELECT status FROM carts WHERE id = $1",
        [loggedUser.id_cart]
    )

    let cartId; 
    let status;

    if(existCart.rows.length === 0){
        const newCart = await pool.query(
            "INSERT INTO carts(user_id) VALUES ($1) RETURNING id, status",
            [loggedUser.id]
        );
        cartId = newCart.rows[0].id;
        status = newCart.rows[0].status;
    }else{
        cartId = existCart.rows[0].id;
        status = existCart.rows[0].status;
    }

    res.status(200).json({
        cart_id: loggedUser.id_cart,
        status: status
    });
})

export default router;