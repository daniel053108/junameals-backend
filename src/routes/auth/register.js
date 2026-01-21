import express from "express";
import bcrypt from "bcrypt";
import pool from "../../db.js";

const router = express.Router();

router.post("/", async (req,res) => {
    try{
        const { user_name, email, password } = req.body;

        if(!user_name || !email || !password){
            return res.status(400).json({
                error: "Todos los campos son obligatorios",
            });
        }

        if(password.length < 8){
            return res.status(400).json({
                error: "La contraseña nueva debe tener mínimo 8 caracteres, una mayúscula y un carácter especial",
            })
        }
        
        const strongPassword = /^(?=.*[A-Z])(?=.*[_!@#$%^&*(),.?":{}|<>]).{8,}$/.test(password);

        if (!strongPassword) {
            return res.status(400).json({
                error: "La contraseña debe tener mínimo 8 caracteres, una mayúscula y un carácter especial",
            });
        }

        const userExist = await pool.query("SELECT id FROM users WHERE email = $1 OR name = $2", [email,user_name]);

        if(userExist.rows.length > 0){
            return res.status(400).json({
                error: "El correo o nombre de usuario ya han sido registrados",
            });
        }

        const passwordHash = await bcrypt.hash(password,10);

        const result = await pool.query(
            "INSERT INTO users(name,email,password_hash) VALUES ($1,$2,$3) RETURNING id, name, email", 
            [user_name, email, passwordHash]);
        
        const resultCart = await pool.query(
            "INSERT INTO carts(user_id) VALUES ($1) RETURNING id",
            [result.rows[0].id]
        );    

        res.status(201).json({
            user: result.rows[0],
        });

    }catch(error){
        console.log(error);
        res.status(500).json({
            error: "Error intentando registrar usuario",
        });
    }
})

export default router;