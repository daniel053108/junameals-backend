import multer, { memoryStorage } from "multer";
import cloudinary from "../../config/cloudinary.js";
import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";


const router = Router();

const upload = multer({ storage: memoryStorage() });

router.post("/upload-image",authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const result = await cloudinary.upload_stream(
      { folder: "products" },
      (error, result) => {
        if (error) return res.status(500).json(error);
        res.json({ imageUrl: result.secure_url });
      }
    ).end(req.file.buffer);
    console.log(result);
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
