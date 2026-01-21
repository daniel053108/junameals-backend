import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import pool from "../../db.js";
import bcrypt from "bcrypt";

const router = express.Router();

router.get("/", authMiddleware, (req, res) => {
    res.status(200).json({
        user: req.user,
    });
});

router.get("/getUser", authMiddleware, async (req,res) => {
    const user = req.user;
    try{
        const userData = await pool.query(
            "SELECT id, name, email FROM users WHERE id = $1",
            [user.id]
        );

        const userCart = await pool.query(
            "SELECT id FROM carts WHERE user_id = $1",
            [user.id]
        );

        if(userData.rows.length === 0 || userCart.rows.length === 0){
            return res.status(400).json({error: "Error al obtener los datos del usuario"});
        }

        return res.status(200).json({
            id: user.id,
            name: userData.rows[0].name,
            email: userData.rows[0].email,
            id_cart: userCart.rows[0].id
        });
    }catch{
        return res.status(500).json({error: "Error al obtener los datos del usuario"});
    }  
});

router.get("/getAddresses", authMiddleware,async (req,res) => {
    const userId = req.user.id;

    try{
        const addresses = await pool.query(
            `SELECT id, street, neighborhood, city, state, postal_code, country, delivery_notes, is_default 
            FROM Addresses 
            WHERE user_id = $1`,
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
                            postalCode: address.postal_code,
                            country: address.country,
                            deliveryNotes: address.delivery_notes,
                            isDefault: address.is_default }})
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
            delivery_notes,is_default) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [userId,address.street,address.neighborhood, address.city, address.state,
            address.postalCode,address.country,address.deliveryNotes,
            address.isDefault]
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
                address.postalCode,
                address.country,
                address.deliveryNotes,
                address.isDefault,
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

router.put("/updateName", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const newName = req.body.newName;

    try{

        if(!newName)return res.status(400).json({error: "Nombre no valido"});

        await pool.query(
            "UPDATE users SET name = $1 WHERE id = $2",
            [newName, userId]
        );

        return res.status(200).json({message: "Nombre de usuario actualizado correctamente"});

    }catch(error){
        return res.status(500).json({error: "Error al actualizar el nombre del usuario"});
    }
});

router.put("/updatePassword", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { password, newPassword } = req.body;

    try{

        if(!password || !newPassword){
            return res.status(400).json({error: "Datos incompletos"});
        }

        const oldPasswordHash = await pool.query(
            "SELECT password_hash FROM users WHERE id = $1",
            [userId]
        )

        if(oldPasswordHash.rows.length === 0){
            return res.status(400).json({error: "Usuario no encontrado"});
        }
    
        const correctPassword = await bcrypt.compare(password, oldPasswordHash.rows[0].password_hash);

        if(!correctPassword){
            return res.status(400).json({error: "La contraseña ingresada no coincide con la del usuario"});
        }

        const samePassword = await bcrypt.compare(
            newPassword,
            oldPasswordHash.rows[0].password_hash
        ); 

        if (samePassword) {
            return res.status(400).json({
                error: "La nueva contraseña no puede ser igual a la anterior"
            });
        }

        if(newPassword.length < 8){
            return res.status(400).json({
                error: "La contraseña nueva debe tener mínimo 8 caracteres, una mayúscula y un carácter especial",
            })
        }
        
        const strongPassword = /^(?=.*[A-Z])(?=.*[_!@#$%^&*(),.?":{}|<>]).{8,}$/.test(newPassword);

        if (!strongPassword) {
            return res.status(400).json({
                error: "La contraseña nueva debe tener mínimo 8 caracteres, una mayúscula y un carácter especial",
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [newPasswordHash, userId]
        );

        return res.status(200).json({message: "Contraseña actualizada correctamente"});

    }catch(error){
        return res.status(500).json({error: "Error al actualizar la contraseña del usuario"});
    }
});

router.put("/updateEmail", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const newEmail = req.body.newEmail;

    try{
        await pool.query(
            "UPDATE users SET email = $1 WHERE id = $2",
            [newEmail, userId]
        );

        return res.status(200).json({message: "Email de usuario actualizado correctamente"});

    }catch(error){
        return res.status(500).json({error: "Error al actualizar el email del usuario"});
    }
});
export default router;
