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

    // Find HR employee by ID
    const hr = await HrEmployee.findById(decoded.id);

    if (!hr) {
      return res.status(401).json({
        success: false,
        error: "Invalid token - user not found"
      });
    }

    // Check if account is active
    if (hr.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated. Please contact administrator."
      });
    }

    // Attach both for flexibility
    req.user = hr;
    req.hr = hr;

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

module.exports = authenticateToken;

