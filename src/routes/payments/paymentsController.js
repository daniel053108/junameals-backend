import authMiddleware from "../../middlewares/authMiddleware.js";
import { createMpPreferenceService } from "./paymentsServices.js";
import express from "express";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {    
    try {
        const userId = req.user.id;
        const  orderId  = req.body.id;

        const preference = await createMpPreferenceService(userId, orderId);
        
        res.json(preference);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});

export default router;