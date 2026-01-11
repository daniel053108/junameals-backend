import express from "express";
import routerLogin from "./login.js";
import routerRegister from "./register.js";
import routerLogout from "./logout.js";
import routerStatus from "./status.js";

const router = express.Router();

router.use("/register", routerRegister);

router.use("/login", routerLogin);

router.use("/logout", routerLogout);

router.use("/status", routerStatus);

export default router;