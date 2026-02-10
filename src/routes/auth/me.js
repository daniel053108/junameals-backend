import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import pool from "../../db.js";
import bcrypt from "bcrypt";

const router = express.Router();

router.get("/", authMiddleware, (req, res) => {
    res.status(200).json({
        user: req.user,
    });
});

router.get("/getUser", authMiddleware, async (req,res) => {
    const user = req.user;
    try{
        const userData = await pool.query(
            "SELECT id, name, email FROM users WHERE id = $1",
            [user.id]
        );

        const userCart = await pool.query(
            "SELECT id FROM carts WHERE user_id = $1",
            [user.id]
        );

        if(userData.rows.length === 0 || userCart.rows.length === 0){
            return res.status(400).json({error: "Error al obtener los datos del usuario"});
        }

        return res.status(200).json({
            id: user.id,
            role: user.role,
            name: userData.rows[0].name,
            email: userData.rows[0].email,
            id_cart: userCart.rows[0].id
        });
    }catch{
        return res.status(500).json({error: "Error al obtener los datos del usuario"});
    }  
});

router.put("/updateName", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const newName = req.body.newName;

    try{

        if(!newName)return res.status(400).json({error: "Nombre no valido"});

        await pool.query(
            "UPDATE users SET name = $1 WHERE id = $2",
            [newName, userId]
        );

        return res.status(200).json({message: "Nombre de usuario actualizado correctamente"});

    }catch(error){
        return res.status(500).json({error: "Error al actualizar el nombre del usuario"});
    }
});

router.put("/updatePassword", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { password, newPassword } = req.body;

    try{

        if(!password || !newPassword){
            return res.status(400).json({error: "Datos incompletos"});
        }

        const oldPasswordHash = await pool.query(
            "SELECT password_hash FROM users WHERE id = $1",
            [userId]
        )

        if(oldPasswordHash.rows.length === 0){
            return res.status(400).json({error: "Usuario no encontrado"});
        }
    
        const correctPassword = await bcrypt.compare(password, oldPasswordHash.rows[0].password_hash);

        if(!correctPassword){
            return res.status(400).json({error: "La contraseña ingresada no coincide con la del usuario"});
        }

        const samePassword = await bcrypt.compare(
            newPassword,
            oldPasswordHash.rows[0].password_hash
        ); 

        if (samePassword) {
            return res.status(400).json({
                error: "La nueva contraseña no puede ser igual a la anterior"
            });
        }

        if(newPassword.length < 8){
            return res.status(400).json({
                error: "La contraseña nueva debe tener mínimo 8 caracteres, una mayúscula y un carácter especial",
            })
        }
        
        const strongPassword = /^(?=.*[A-Z])(?=.*[_!@#$%^&*(),.?":{}|<>]).{8,}$/.test(newPassword);

        if (!strongPassword) {
            return res.status(400).json({
                error: "La contraseña nueva debe tener mínimo 8 caracteres, una mayúscula y un carácter especial",
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [newPasswordHash, userId]
        );

        return res.status(200).json({message: "Contraseña actualizada correctamente"});

    }catch(error){
        return res.status(500).json({error: "Error al actualizar la contraseña del usuario"});
    }
});

router.put("/updateEmail", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const newEmail = req.body.newEmail;

    try{
        await pool.query(
            "UPDATE users SET email = $1 WHERE id = $2",
            [newEmail, userId]
        );

        return res.status(200).json({message: "Email de usuario actualizado correctamente"});

    }catch(error){
        return res.status(500).json({error: "Error al actualizar el email del usuario"});
    }
});
export default router;
