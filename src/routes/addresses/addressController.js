import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import pool from "../../db.js";

const router = Router();

router.get("/getMidpoints", async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT *
             FROM addresses
             WHERE is_midpoint = true
             ORDER BY created_at DESC`
        );
        return res.status(200).json(rows);
    } catch (error) {
        console.error("Error obteniendo midpoints:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});

router.get("/getAddresses", authMiddleware,async (req,res) => {
    const userId = req.user.id;

    try{
        const addresses = await pool.query(
            `SELECT *
            FROM addresses 
            WHERE user_id = $1
            ORDER BY is_default DESC`,
        [userId]);
        
        if(addresses.rows.length === 0){
            return res.status(404).json({
                idDefaultAddress: null,
                addresses: []
            });
        }

        const defaultAddress = await pool.query(
            "SELECT id FROM Addresses WHERE is_default = true AND user_id = $1",
            [userId]
        );

        const idDefaultAddress = defaultAddress.rows.length !== 0 ? defaultAddress.rows[0].id : null;

        return res.status(200).json({
            idDefaultAddress: idDefaultAddress,
            addresses: addresses.rows.map((address) => {return {
                            id: address.id,
                            street: address.street,
                            neighborhood: address.neighborhood,
                            city: address.city,
                            state: address.state,
                            postal_code: address.postal_code,
                            country: address.country,
                            delivery_notes: address.delivery_notes,
                            is_default: address.is_default,
                            is_midpoint: address.is_midpoint
                        }})
        });

    }catch(error){
        return res.status(500).json({error: "Error al intentar obtener las direcciones del usuario"});
    }
})

router.post("/addAddress" ,authMiddleware, async (req, res) => {
    const address = req.body;
    const userId = req.user.id;

    try{
        const defaultAddress = await pool.query(
            "SELECT id FROM Addresses WHERE is_default = true AND user_id = $1",
            [userId]
        )
        
        if(defaultAddress.rows.length !== 0 && address.isDefault){
            await pool.query(
                "UPDATE Addresses SET is_default = false WHERE is_default = true AND user_id = $1",
                [userId]
            );
        }

        const newAddress = await pool.query(
            `INSERT INTO Addresses(user_id,street,neighborhood,city,state,postal_code,country,
            delivery_notes,is_default, is_midpoint) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [userId,address.street,address.neighborhood, address.city, address.state,
            address.postal_code,address.country,address.delivery_notes,
            address.is_default,address.is_midpoint]
        );
        
        if(newAddress.rows.length === 0){
            return res.status(400).json({error: "No se ha podido registrar la dirrecion ingresada"});
        }
            
        return res.status(200).json({message: "Direccion agregada correctamente"});

    }catch(error){
        return res.status(500).json({error: "Error al agregar direccion nueva"});
    }
    
});

router.put("/updateAddress", authMiddleware, async (req,res) => {
    const address = req.body;
    const userId = req.user.id;
    
    if (!address.id) {
        return res.status(400).json({ error: "ID de dirección inválido" });
    }
    try{

        let idDefaultAddress;
        const defaultAddress = await pool.query(
            "SELECT id FROM Addresses WHERE user_id = $1 AND is_default = true",
            [userId]
        );

        if(defaultAddress.rows.length > 0){
            idDefaultAddress = defaultAddress.rows[0].id;
        };
        
        if(address.isDefault){
            if(defaultAddress.rows.length !== 0){
                await pool.query(
                    "UPDATE Addresses SET is_default = false WHERE is_default = true AND user_id = $1",
                    [userId]
                );
            };

            idDefaultAddress = address.id;
        }

        const updateAddress = await pool.query(
            `UPDATE Addresses SET
            street = $1,
            neighborhood = $2,
            city = $3,
            state = $4,
            postal_code = $5,
            country = $6,
            delivery_notes = $7,
            is_default = $8 WHERE id = $9 AND user_id = $10 RETURNING *`,
            [
                address.street,
                address.neighborhood,
                address.city,
                address.state,
                address.postal_code,
                address.country,
                address.delivery_notes,
                address.is_default,
                address.id,
                userId
            ]
        );

        if(updateAddress.rows.length !== 0){
            return res.status(200).json({message: "Direccion actualizada correctamente"});
        }

        return res.status(400).json({error: "Error al actualizar la direccion"});

    }catch(error){
        return res.status(500).json({error: "Error del servidor al actualizar la direccion"});
    }
});

router.delete("/removeAddress/id/:addressId", authMiddleware, async (req,res) => {
    const { addressId } = req.params;
    const userId = req.user.id;

    try{

        const removedAddress = await pool.query(
            "DELETE FROM Addresses WHERE id = $1 AND user_id = $2 RETURNING id",
            [addressId, userId]
        );

        if(removedAddress.rows.length === 0){
            return res.status(400).json({error: "Error al eliminar la direccion"});
        }

        return res.status(200).json({message: "Direccion eliminada correctamente"});
    }catch(error){
        return res.status(500).json({error: "Error interno al eliminar la direccion"});
    }
});

export default router;