import express from "express"
import routePaymentController from "./paymentsController.js";

const router = express.Router();

router.use("/preference", routePaymentController);

export default router;
