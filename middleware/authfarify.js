import jwt from "jsonwebtoken";

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                status: false,
                message: "Access denied. No token provided or invalid format (Use: Bearer <token>)"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                status: false,
                message: "Access denied. Token missing"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "spotify_secret_key_123");
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            status: false,
            message: "Invalid or expired token",
            error: error.message
        });
    }
};

// Role-based authorization middleware (e.g. checkRole("artist", "admin"))
export const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: false,
                message: `Forbidden: Access denied. Required role: ${allowedRoles.join(", ")}`
            });
        }
        next();
    };
};

export default verifyToken;
