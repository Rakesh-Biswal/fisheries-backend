const jwt = require('jsonwebtoken');
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if it's a sales employee
    if (decoded.role !== "sales-employee") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Sales employee only.",
      });
    }

    const salesEmployee = await SalesEmployeeEmployee.findById(
      decoded.id
    ).select("-password");

    if (!salesEmployee || salesEmployee.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Sales employee not found or inactive",
      });
    }

    req.salesEmployee = {
      id: salesEmployee._id,
      name: salesEmployee.name,
      email: salesEmployee.companyEmail,
      role: salesEmployee.role,
    };

    next();
  } catch (error) {
    console.error("Sales employee auth error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};


// Simple authentication middleware for testing
const authenticateToken = async (req, res, next) => {
  try {
    // For testing, you can temporarily bypass auth
    // Remove this in production
    req.user = { id: '65d8f5a8e4b1c2d3e4f5a6b7' }; // Mock user ID for testing
    return next();

    /* Uncomment for real authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
    */
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = {
  authenticateToken,
  SalesEmployeeAuth,
};
