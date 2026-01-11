import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try{
        const result = await pool.query("SELECT * FROM products ORDER BY id");
        res.json(result.rows);
    }catch (error){
        console.log(error);
        res.status(500).json({error: "Error al obtener productos"});
    }
});

router.get("/recommended", async (req,res) => {
    try{
        const result = await pool.query("SELECT * FROM products WHERE recommended = true");
        res.json(result.rows);
    }catch(error){
        console.log(error);
        res.status(500).json({error: "Error al obtener productos recomendados"});
    }
});

export default router;