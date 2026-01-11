import express from "express";
import routerProducts from "./products.js";
import routerAuth from "./auth/index.js"

const router = express.Router();

router.use("/products", routerProducts);

router.use("/auth", routerAuth);

export default router;