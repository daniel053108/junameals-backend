import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, (req, res) => {
    res.status(200).json({
        user: req.user,
    });
});

export default router;
