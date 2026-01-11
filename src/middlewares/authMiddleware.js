import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;

    //Si no hay token
    if (!token) {
        return res.status(401).json({
            error: "Token invalido o expirado"
        });
    }

    try {
        //Verificamos el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //Guardamos el usuario en la request
        req.user = decoded;

        //Dejamos pasar
        next();
    } catch (error) {
        return res.status(401).json({
            error: "Token inválido o expirado"
        });
    }
};

export default authMiddleware;
