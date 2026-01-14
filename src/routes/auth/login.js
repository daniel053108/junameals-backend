import bcrypt from "bcrypt";
import  express from "express";
import jwt from "jsonwebtoken";
import authMiddleware from "../../middlewares/authMiddleware.js";
import pool from "../../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
    const {user_email, password} = req.body;

    if(!user_email || !password){
        return res.status(400).json({
            error: "Todos los campos son obligatorios",
        });
    };

    const usersExist = await pool.query("SELECT id,name,email,password_hash FROM users WHERE email = $1 OR name = $1", [user_email]);
    
    if(usersExist.rows.length === 0){
        return res.status(400).json({
            error: "Credenciales Invalidas",
        });
    }

    const user = usersExist.rows[0];
    const userValid = await bcrypt.compare(password,user.password_hash);

    if(!userValid){
        return res.status(400).json({
            error: "Credenciales Invalidas",
        });
    }

    const userCart = await pool.query(
        "SELECT id FROM carts WHERE user_id = $1",
        [user.id]
    )
    
    let cartId;

    if(userCart.rows.length === 0){
        const newCart = await pool.query(
            "INSERT INTO carts(user_id) VALUES ($1) RETURNING id",
            [user.id]
        );
        cartId = newCart.rows[0].id;
    }else{
        cartId = userCart.rows[0].id;
    }

    const token = jwt.sign(
        {
            id: user.id, 
            email: user.email, 
            id_cart: cartId
        },
        process.env.JWT_SECRET,
        {expiresIn: "1d"}
    );

    res.cookie(
        "token", token,{
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
        }
    )

    return res.json({message: "Inicio de Sesion Valido", user: user })

});

export default router;