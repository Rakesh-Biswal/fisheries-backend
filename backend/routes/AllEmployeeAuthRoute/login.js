require("dotenv").config({ path: __dirname + "/../../.env" });
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Ceo = require("../../models/CEO/CeoPi");
const HrEmployee = require("../../models/HR/HrEmployee");
const SalesEmployeeEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee");
const router = express.Router();

// Check if JWT secret is available
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is not defined in environment variables");
  throw new Error("JWT_SECRET is required");
}

console.log("🔑 JWT Secret loaded:", process.env.JWT_SECRET ? "Yes" : "No");

// Employee sign-in with email and password (for website - CEO, HR)
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    // Check if it's the CEO
    let user = await Ceo.findOne({ email: email });

    if (user) {
      // Verify CEO password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("EmployeeToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.json({
        success: true,
        message: "CEO sign in successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        redirectTo: "/dashboard/ceo/overview",
      });
    }

    // Check if it's an HR employee
    user = await HrEmployee.findOne({ companyEmail: email });

    if (user) {
      // Verify HR password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      // Check if HR is active
      if (user.status !== "active") {
        return res.status(401).json({
          success: false,
          error: "Your account is deactivated. Please contact administrator.",
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.companyEmail,
          role: user.role,
          name: user.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("EmployeeToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.json({
        success: true,
        message: "HR sign in successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.companyEmail,
          role: user.role,
          photo: user.photo,
        },
        redirectTo: "/dashboard/hr/overview",
      });
    }

    // If no user found
    return res.status(401).json({
      success: false,
      error: "No employee found with this email",
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Mobile App Login for Sales Employees
router.post("/workerlogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    console.log("🔐 Login attempt for:", email);

    // Check if JWT secret is available
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET missing in workerlogin");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    // Check if it's a sales employee
    const salesEmployee = await SalesEmployeeEmployee.findOne({
      companyEmail: email.toLowerCase().trim(),
    }).populate("businessData");

    if (!salesEmployee) {
      console.log("❌ No sales employee found with email:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("✅ Sales employee found:", salesEmployee.name);

    // Check if sales employee is active
    if (salesEmployee.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Your account is deactivated. Please contact HR.",
      });
    }

    // Verify password
    console.log("🔑 Verifying password...");
    const isPasswordValid = await bcrypt.compare(
      password,
      salesEmployee.password
    );
    if (!isPasswordValid) {
      console.log("❌ Invalid password for:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("✅ Password verified successfully");

    // Generate JWT token for mobile app
    console.log("🎫 Generating JWT token...");
    const token = jwt.sign(
      {
        id: salesEmployee._id,
        email: salesEmployee.companyEmail,
        role: salesEmployee.role,
        name: salesEmployee.name,
        empCode: salesEmployee.empCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" } // Longer expiry for mobile app
    );

    console.log("✅ JWT token generated");

    // Prepare user data for response (exclude sensitive info)
    const userResponse = {
      _id: salesEmployee._id,
      name: salesEmployee.name,
      companyEmail: salesEmployee.companyEmail,
      phone: salesEmployee.phone,
      role: salesEmployee.role,
      empCode: salesEmployee.empCode,
      photo: salesEmployee.photo,
      businessData: salesEmployee.businessData || null,
    };

    console.log("✅ Login successful for:", salesEmployee.name);

    // For mobile app, return token in response body (not cookie)
    res.json({
      success: true,
      message: "Login successful",
      token: token,
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Sales employee login error:", error);

    // Specific error handling
    if (error.message.includes("secretOrPrivateKey")) {
      console.error("❌ JWT_SECRET is missing or invalid");
      return res.status(500).json({
        success: false,
        message: "Server configuration error - please contact administrator",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get current sales employee profile (for mobile app)
router.get("/sales-profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const salesEmployee = await SalesEmployeeEmployee.findById(decoded.id)
      .populate("businessData")
      .select("-password");

    if (!salesEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: salesEmployee,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

// Sign out endpoint
router.post("/signout", (req, res) => {
  res.clearCookie("EmployeeToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.json({
    success: true,
    message: "Sign out successful",
  });
});

module.exports = router;
