const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Ceo = require('./../../models/CEO/CeoPi');
const router = express.Router();

// CEO credentials (you might want to move this to environment variables)
const CEO_EMAIL = "ceo@fisheries.com";
const CEO_PASSWORD = "ceo@fisheries123";

// Employee sign-in with email and password
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if credentials are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password"
      });
    }

    // Check if it's the CEO
    if (email === CEO_EMAIL) {
      if (password !== CEO_PASSWORD) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials"
        });
      }

      // Check if CEO exists in database, if not create one
      let ceo = await Ceo.findOne({ email: CEO_EMAIL });

      if (!ceo) {
        // Create CEO record if it doesn't exist
        ceo = new Ceo({
          name: "CEO",
          email: CEO_EMAIL,
          password: await bcrypt.hash(CEO_PASSWORD, 12),
          phone: "0000000000",
          status: "active",
          role: "ceo"
        });
        await ceo.save();
      } else {
        // Verify password if CEO exists
        const isPasswordValid = await bcrypt.compare(password, ceo.password);
        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            error: "Invalid credentials"
          });
        }
      }

      const token = jwt.sign(
        {
          id: ceo._id,
          email: ceo.email,
          role: ceo.role,
          name: ceo.name,
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
        message: "Sign in successful",
        user: {
          id: ceo._id,
          name: ceo.name,
          email: ceo.email,
          role: ceo.role
        },
        redirectTo: "/dashboard/ceo"
      });
    }

    // For other employees, you would add your logic here
    // This is where you would check against other employee models

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

// Phone sign-in route (you can implement this later)
router.post('/signin-phone', async (req, res) => {
  // Implementation for phone sign-in
  res.status(501).json({
    success: false,
    error: "Phone sign-in not implemented yet"
  });
});

module.exports = router;