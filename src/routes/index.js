import express from "express";
import routerProducts from "./products.js";
import routerAuth from "./auth/index.js"
import routerCart from "./cart.js";

const router = express.Router();

router.use("/products", routerProducts);

router.use("/auth", routerAuth);

router.use("/cart", routerCart);

export default router;