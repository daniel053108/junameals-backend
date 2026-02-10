import express from "express";
import bcrypt from "bcrypt";
import pool from "../../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { user_name, email, password, phone_number } = req.body;

        // 🔒 Validación de campos obligatorios
        if (!user_name || !email || !password || !phone_number) {
            return res.status(400).json({
                error: "Todos los campos son obligatorios",
            });
        }

        // 📱 Validación básica de teléfono
        const phoneRegex = /^\+?[0-9 ]{7,20}$/;
        if (!phoneRegex.test(phone_number)) {
            return res.status(400).json({
                error: "Número de teléfono no válido",
            });
        }

        // 🔐 Validación de contraseña
        if (password.length < 8) {
            return res.status(400).json({
                error: "La contraseña debe tener mínimo 8 caracteres, una mayúscula y un carácter especial",
            });
        }

        const strongPassword =
            /^(?=.*[A-Z])(?=.*[_!@#$%^&*(),.?":{}|<>]).{8,}$/.test(password);

        if (!strongPassword) {
            return res.status(400).json({
                error: "La contraseña debe tener mínimo 8 caracteres, una mayúscula y un carácter especial",
            });
        }

        // 🔎 Verificar si ya existe usuario, email o teléfono
        const userExist = await pool.query(
            "SELECT id FROM users WHERE email = $1 OR name = $2 OR phone_number = $3",
            [email, user_name, phone_number]
        );

        if (userExist.rows.length > 0) {
            return res.status(400).json({
                error: "El correo, nombre de usuario o teléfono ya están registrados",
            });
        }

        // 🔐 Hash de contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // 👤 Crear usuario
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone_number)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, phone_number`,
            [user_name, email, passwordHash, phone_number]
        );

        // 🛒 Crear carrito
        await pool.query(
            "INSERT INTO carts (user_id) VALUES ($1)",
            [result.rows[0].id]
        );

        res.status(201).json({
            user: result.rows[0],
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error intentando registrar usuario",
        });
    }
});

export default router;
