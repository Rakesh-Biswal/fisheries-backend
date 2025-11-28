// backend/routes/SalesEmployeeRoutes/auth.js
const express = require("express");
const router = express.Router();
const SalesEmployeeEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Sales Employee Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const salesEmployee = await SalesEmployeeEmployee.findOne({
      companyEmail: email.toLowerCase().trim(),
    }).populate("businessData");

    if (!salesEmployee) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (salesEmployee.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Your account is deactivated. Please contact HR.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      salesEmployee.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: salesEmployee._id,
        email: salesEmployee.companyEmail,
        role: salesEmployee.role,
        name: salesEmployee.name,
        empCode: salesEmployee.empCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

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

    res.json({
      success: true,
      message: "Login successful",
      token: token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Sales employee login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get Sales Employee Profile
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
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

// Change Password
router.post("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await SalesEmployeeEmployee.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedNewPassword;
    user.updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const user = await SalesEmployeeEmployee.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number",
      });
    }

    res.json({
      success: true,
      message:
        "Password reset request has been sent to HR. They will contact you shortly.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process forgot password request",
    });
  }
});

router.post("/verify-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await SalesEmployeeEmployee.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Clean phone numbers for comparison
    const cleanInputPhone = phone.replace(/\D/g, "");
    const cleanUserPhone = user.phone.replace(/\D/g, "");

    if (cleanInputPhone !== cleanUserPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number does not match your registered number",
      });
    }

    res.json({
      success: true,
      message: "Phone number verified successfully",
    });
  } catch (error) {
    console.error("Phone verification error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to verify phone number",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    if (!phone || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Phone number and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await SalesEmployeeEmployee.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify phone number again for security
    const cleanInputPhone = phone.replace(/\D/g, "");
    const cleanUserPhone = user.phone.replace(/\D/g, "");

    if (cleanInputPhone !== cleanUserPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number verification failed",
      });
    }

    // Hash and update password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedNewPassword;
    user.updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
});

module.exports = router;
