// middleware/authMiddleware.js - FIXED VERSION
const jwt = require("jsonwebtoken");
const SalesEmployeeEmployee = require("../models/SALESEMPLOYEE/SalesEmployeeEmployee");

const SalesEmployeeAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔐 Decoded token:", decoded);

    // Check if it's a sales employee
    if (decoded.role !== "sales-employee") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Sales employee only.",
      });
    }

    // Find sales employee in database
    const salesEmployee = await SalesEmployeeEmployee.findById(
      decoded.id
    ).select("-password");

    if (!salesEmployee) {
      return res.status(401).json({
        success: false,
        message: "Sales employee not found",
      });
    }

    if (salesEmployee.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Sales employee account is inactive",
      });
    }

    // Attach sales employee info to request
    req.salesEmployee = {
      id: salesEmployee._id.toString(),
      name: salesEmployee.name,
      email: salesEmployee.companyEmail,
      role: salesEmployee.role,
    };

    console.log("✅ Sales employee authenticated:", req.salesEmployee);
    next();
  } catch (error) {
    console.error("❌ Sales employee auth error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

// Simple authentication middleware for testing (if needed)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = {
  authenticateToken,
  SalesEmployeeAuth,
};