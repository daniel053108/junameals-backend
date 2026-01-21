import authMiddleware from "../../middlewares/authMiddleware.js";
import { createMpPreferenceService } from "../payments/paymentsServices.js";
import express from "express";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.body;

        const preference = await createMpPreferenceService(userId, orderId);

        res.json(preference);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});

export default router;