const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Ceo = require('../../models/CEO/CeoPi'); 
const HrEmployee = require('../../models/HR/HrEmployee'); 
const TeamLeaderEmployee = require('../../models/TEAMLEADER/TeamLeaderEmployee'); // Updated import
const router = express.Router();

// Employee sign-in with email and password
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password"
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
          error: "Invalid credentials"
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
          role: user.role
        },
        redirectTo: "/dashboard/ceo/overview"
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
          error: "Invalid credentials"
        });
      }

      // Check if HR is active
      if (user.status !== "active") {
        return res.status(401).json({
          success: false,
          error: "Your account is deactivated. Please contact administrator."
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
          photo: user.photo // Include photo for HR
        },
        redirectTo: "/dashboard/hr/overview" // Redirect to HR dashboard
      });
    }

    // Check if it's a Team Leader (using TeamLeaderEmployee model)
    user = await TeamLeaderEmployee.findOne({ companyEmail: email });

    if (user) {
      // Verify Team Leader password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials"
        });
      }

      // Check if Team Leader is active
      if (user.status !== "active") {
        return res.status(401).json({
          success: false,
          error: "Your account is deactivated. Please contact administrator."
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.companyEmail,
          role: "teamleader", // Set role as teamleader
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
        message: "Team Leader sign in successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.companyEmail,
          role: "teamleader",
          photo: user.photo, // Include photo for Team Leader
          empCode: user.empCode // Include employee code
        },
        redirectTo: "/dashboard/teamleader/overview" // Redirect to Team Leader dashboard
      });
    }

    // If no user found
    return res.status(401).json({
      success: false,
      error: "No employee found with this email"
    });

  } catch (error) {
    console.error("Sign-in error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Sign out endpoint
router.post('/signout', (req, res) => {
  res.clearCookie("EmployeeToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.json({
    success: true,
    message: "Sign out successful"
  });
});

module.exports = router;