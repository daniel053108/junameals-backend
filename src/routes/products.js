import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import pool from "../db.js";
import authMiddleware from "../../src/middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


router.get("/", async (req, res) => {
    try{
        const result = await pool.query("SELECT * FROM products WHERE weekly_menu = false ORDER BY id");
        res.json(result.rows);
    }catch (error){
        console.log(error);
        res.status(500).json({error: "Error al obtener productos"});
    }
});

router.get("/recommended", async (req,res) => {
    try{
        const result = await pool.query("SELECT * FROM products WHERE recommended = true AND available = true");
        res.json(result.rows);
    }catch(error){
        console.log(error);
        res.status(500).json({error: "Error al obtener productos recomendados"});
    }
});

router.get("/weeklyMenu", async (req,res) => {
    try{
        const WeeklyMenu = await pool.query(
            "SELECT * FROM products WHERE weekly_menu = true"
        );
        
        if(WeeklyMenu.rows.length === 0){
            return res.status(400).json({error: "Productos no disponibles o inexistentes"});
        }

        res.status(200).json(WeeklyMenu.rows);
    }catch{
        res.status(500).json({error: "Error al obtener los productos solicitados"});
    }
});

router.delete("/delete-product/:productId", authMiddleware, async (req,res) => {
    const {productId} = req.params;
    console.log(productId);
    try{
        if(!productId){
            throw new Error("Id innexistente");
        }

        await pool.query(
            "DELETE FROM products WHERE id = $1",
            [productId]
        )

        res.sendStatus(204);
    }catch(error){
        console.error(error)
        res.sendStatus(500);
    }
});

router.post(
    "/add-product",
    authMiddleware,
    upload.single("image"),
    async (req, res) => {
        try {

            const { name, description, price } = req.body;

            console.log()
            if (!name || !description || !price || !req.file) {
                return res.status(400).json({ message: "Datos incompletos" });
            }

            // Subir imagen a Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: "products" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(req.file.buffer);
            });

            const imageUrl = uploadResult.secure_url;

            // Guardar producto en DB
            await pool.query(
                `
                INSERT INTO products (name, description, price, image)
                VALUES ($1, $2, $3, $4)
                `,
                [name, description, price, imageUrl]
            );

            res.status(201).json({ message: "Producto creado" });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error del servidor" });
        }
    }
);

router.post(
    "/update-product",
    authMiddleware,
    upload.single("image"),
    async (req, res) => {
        try {
            console.log(req.body);
            const {
                id,
                name,
                description,
                price,
                available,
                recommended,
                weekly_menu,
            } = req.body;

            if (!id || !name || !price) {
                return res.status(400).json({ message: "Datos no válidos" });
            }

            let imageUrl = null;

            if (req.file) {
                const uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: "products" },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    ).end(req.file.buffer);
                });

                imageUrl = uploadResult.secure_url;
            }
            const query = imageUrl
                ? `
                    UPDATE products
                    SET name=$1, description=$2, price=$3, image=$4,
                        available=$5, recommended=$6, weekly_menu=$7
                    WHERE id=$8
                  `
                : `
                    UPDATE products
                    SET name=$1, description=$2, price=$3,
                        available=$4, recommended=$5, weekly_menu=$6
                    WHERE id=$7
                  `;

            const values = imageUrl
                ? [
                      name,
                      description,
                      price,
                      imageUrl,
                      available,
                      recommended,
                      weekly_menu,
                      id,
                  ]
                : [
                      name,
                      description,
                      price,
                      available,
                      recommended,
                      weekly_menu,
                      id,
                  ];

            await pool.query(query, values);

            res.sendStatus(200);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al actualizar producto" });
        }
    }
);

router.get("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        if (!id) {
            return res.status(400).json({ message: "ID inválido" });
        }

        const result = await pool.query(
            "SELECT id, name, description, price, image, available, recommended, weekly_menu FROM products WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching product:", error);
        res.sendStatus(500);
    }
});

export default router;