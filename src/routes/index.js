import express from "express";
import routerProducts from "./products.js";
import routerAuth from "./auth/index.js"
import routerCart from "./cart.js";
import routerOrders from "./orders/index.js";
import routerPayments from "./payments/index.js";
import routerWebhooks from "./webhooks/index.js";
import routerImages from "./images/index.js";

const router = express.Router();

router.use("/products", routerProducts);

router.use("/auth", routerAuth);

router.use("/cart", routerCart);

router.use("/images", routerImages);

router.use("/orders", routerOrders);

router.use("/payments", routerPayments);

router.use("/webhooks", routerWebhooks);

export default router;