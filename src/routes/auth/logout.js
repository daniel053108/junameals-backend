import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, (req,res) => {
    res.clearCookie("token");
    req.json({message: "Sesion Cerrada"});
})

export default router;