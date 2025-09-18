const jwt = require("jsonwebtoken");
const HrEmployee = require("../../models/HR/HrEmployee");

const authenticateToken = async (req, res, next) => {
    try {
        const token = req.cookies?.EmployeeToken;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Access token required. Please log in."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user and attach to request
        const user = await HrEmployee.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid token - user not found"
            });
        }

        // Check if account is active
        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                error: "Account is deactivated. Please contact administrator."
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                error: "Invalid token. Please log in again."
            });
        }
        
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                error: "Token expired. Please log in again."
            });
        }

        res.status(500).json({
            success: false,
            error: "Authentication failed"
        });
    }
};

module.exports = { authenticateToken };