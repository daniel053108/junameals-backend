import { Router } from "express";
import routerImageManager from "./images-manager.js";

const router = Router();

router.use("/", routerImageManager);

export default router;