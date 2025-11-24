const jwt = require("jsonwebtoken");
const SalesEmployeeEmployee = require("../models/SALESEMPLOYEE/SalesEmployeeEmployee");
const FarmerLead = require("../models/SALESEMPLOYEE/farmerLeads");

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

// Farmer Authentication Middleware - FIXED
const FarmerAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header ONLY (not from cookies)
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login again.",
      });
    }

    // Verify JWT token with better error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error("JWT Verification Error:", jwtError.name, jwtError.message);

      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token format. Please login again.",
        });
      }

      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again.",
        });
      }

      throw jwtError;
    }

    console.log("👨‍🌾 Decoded farmer token:", decoded);

    // Check if it's a farmer token
    if (!decoded.farmerId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token type. Farmer access only.",
      });
    }

    // Find farmer in database
    const farmer = await FarmerLead.findById(decoded.farmerId).select(
      "name phone email address farmSize farmType farmingExperience preferredFishType previousCrops status salesEmployeeApproved teamLeaderApproved hrApproved"
    );

    if (!farmer) {
      return res.status(401).json({
        success: false,
        message: "Farmer account not found",
      });
    }

    // Check if farmer is approved
    const isApproved =
      farmer.salesEmployeeApproved &&
      farmer.teamLeaderApproved &&
      farmer.hrApproved;

    if (!isApproved) {
      return res.status(401).json({
        success: false,
        message: "Your account is pending approval. Please contact support.",
      });
    }

    // Attach farmer info to request
    req.farmer = {
      id: farmer._id.toString(),
      name: farmer.name,
      phone: farmer.phone,
      email: farmer.email,
      address: farmer.address,
      farmSize: farmer.farmSize,
      farmType: farmer.farmType,
      farmingExperience: farmer.farmingExperience,
      preferredFishType: farmer.preferredFishType,
      previousCrops: farmer.previousCrops,
      role: "farmer",
    };

    console.log("✅ Farmer authenticated:", req.farmer.name);
    next();
  } catch (error) {
    console.error("❌ Farmer auth error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

// Project Manager Auth - FIXED
const ProjectManagerAuth = async (req, res, next) => {
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
    console.log("👨‍💼 Decoded project manager token:", decoded);

    // Check if it's a project manager
    if (decoded.role !== "project-manager") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Project manager role required.",
      });
    }

    // Attach user info to request
    req.projectManager = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };

    console.log("✅ Project manager authenticated:", req.projectManager.name);
    next();
  } catch (error) {
    console.error("❌ Project manager auth error:", error);

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

module.exports = {
  SalesEmployeeAuth,
  FarmerAuth,
  ProjectManagerAuth,
};
