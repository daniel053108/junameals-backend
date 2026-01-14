import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import pool from "../db.js";

const router = express.Router();

router.post("/addToCart" , authMiddleware, async (req,res) => {
    const { product, id_cart } = req.body;
    try{
        const existProduct = await pool.query(
            "SELECT id, available, price FROM products WHERE id = $1",
            [product.id]
        )

        if(existProduct.rows.length === 0){
            return res.status(400).json({
                error: "Producto inexistente",
            });
        }else if(existProduct.rows[0].available === false){
            return res.status(400).json({
                error: "El producto no esta disponible",
            });
        }

        const existCartItem = await pool.query(
            "SELECT id,quantity, price FROM cart_items WHERE product_id = $1 AND cart_id = $2",
            [product.id, id_cart]
        )

        if(existCartItem.rows.length === 0){
            const newCartItem = await pool.query(
                "INSERT INTO cart_items(cart_id, product_id, quantity, price) VALUES ($1, $2, $3, $4) RETURNING id",
                [id_cart, product.id, product.quantity, existProduct.rows[0].price]
            )
        }else{
            const quantity = existCartItem.rows[0].quantity + 1;
            const cartItem_id = existCartItem.rows[0].id;
                
            await pool.query(
                "UPDATE cart_items SET quantity = $1 WHERE id = $2",
                [quantity,cartItem_id]
            )
        }

        res.json({
            id: product.id,
            quantity: product.quantity,
            price: existProduct.rows[0].price  
        });
    }catch(error){
        res.status(500).json({error : "Error al agregar el producto al carrito"});
    }
})

router.get("/getCartItems", authMiddleware, async (req,res) =>{
    const { cartId } = req.query;
    try{
        const cartItems = await pool.query(
            "SELECT id,quantity,price FROM cart_items WHERE cart_id = $1",
            [cartId]
        );
        res.status(200).json(cartItems.rows);
    }catch(error){
        console.log(error);
        res.status(500).json({error: "Error al obtener los items del carrito"});
    }
});

router.get("/getCartProducts", authMiddleware, async (req,res) => {
    const { cartId } = req.query;
    
    try{
        const cartProducts = await pool.query(
            "SELECT p.id, p.name, p.price, p.image, ci.quantity FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.cart_id = $1",
            [cartId]
        );

        if(cartProducts.rows.length === 0){
            return res.status(400).json({error: "Carrito Vacio"});
        }

        return res.status(200).json(cartProducts.rows);

    }catch(error){
        return res.status(500).json({error: "Error al obtener los productos del carrito"})
    }
});

router.delete("/removeFromCart/cart/:cartId/item/:itemId", authMiddleware, async (req,res) => {
    const { cartId, itemId } = req.params;

    const item = await pool.query(
        "SELECT id, quantity, price FROM cart_items WHERE cart_id = $1 AND id = $2",
        [cartId, itemId]
    );

    if(item.rows.length === 0){
        return res.status(404).json({error: "Producto no encontrado"});
    }

    await pool.query(
        "DELETE FROM cart_items WHERE id = $1",
        [itemId]
    );

    res.status(200).json(item.rows[0]);
});

router.delete("/clearCart/:cartId", authMiddleware, async (req,res) => {
    const { cartId } = req.params;

    const existCart = await pool.query(
        "DELETE FROM cart_items WHERE cart_id = $1",
        [cartId]
    );

    res.sendStatus(204);
});

export default router;