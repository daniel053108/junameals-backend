import express from "express"
import routeCreateOrder from "./ordersController.js";

const router = express.Router();

router.use("/", routeCreateOrder);

export default router;
