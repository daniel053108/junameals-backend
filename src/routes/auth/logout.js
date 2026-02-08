import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", (req, res) => {
    // Es vital que el dominio y el path coincidan con los de login
    res.clearCookie("token", {
        domain: ".junameals.com",
        path: "/", // Asegúrate de que coincida con el path por defecto o el que pongas
        secure: true,
        sameSite: "lax",
        httpOnly: true
    });
    
    return res.json({ message: "Sesion Cerrada" });
});

export default router;