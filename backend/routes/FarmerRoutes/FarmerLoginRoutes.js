// backend/routes/FarmerRoutes/FarmerLogin.js
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const FarmerLead = require("../../models/SALESEMPLOYEE/farmerLeads");
const { FarmerAuth } = require("../../middleware/authMiddleware");

const JWT_SECRET = process.env.JWT_SECRET;

// Check if phone number exists and send OTP
router.post("/check-phone", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number"
      });
    }

    const farmer = await FarmerLead.findOne({ phone });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number. Please contact our sales team."
      });
    }

    const isApproved = farmer.salesEmployeeApproved && 
                      farmer.teamLeaderApproved && 
                      farmer.hrApproved;

    if (!isApproved) {
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval. Please contact our sales team."
      });
    }

    res.json({
      success: true,
      message: "Phone number verified successfully",
      data: {
        farmerId: farmer._id,
        name: farmer.name,
        phone: farmer.phone,
        address: farmer.address,
        farmSize: farmer.farmSize,
        farmType: farmer.farmType
      }
    });

  } catch (error) {
    console.error("Error checking phone:", error);
    res.status(500).json({
      success: false,
      message: "Error checking phone number",
      error: error.message
    });
  }
});

// Verify OTP and login
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, idToken } = req.body;

    if (!phone || !idToken) {
      return res.status(400).json({
        success: false,
        message: "Phone number and authentication token are required"
      });
    }

    const { verifyFirebaseIdToken } = await import('../../lib/firebaseAdmin.js');

    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(idToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }

    const tokenPhone = decodedToken.phone_number;
    const formattedRequestPhone = formatPhoneNumber(phone);
    
    if (tokenPhone !== formattedRequestPhone) {
      return res.status(401).json({
        success: false,
        message: "Phone number mismatch"
      });
    }

    const farmer = await FarmerLead.findOne({ phone });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    const token = generateFarmerToken(farmer);

    res.cookie("FarmerToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      path: "/",
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        farmer: {
          id: farmer._id,
          name: farmer.name,
          phone: farmer.phone,
          address: farmer.address,
          farmSize: farmer.farmSize,
          farmType: farmer.farmType,
          farmingExperience: farmer.farmingExperience,
          preferredFishType: farmer.preferredFishType
        }
      }
    });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: error.message
    });
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("FarmerToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({
      success: false,
      message: "Error during logout",
      error: error.message
    });
  }
});

function formatPhoneNumber(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

function generateFarmerToken(farmer) {
  const payload = {
    farmerId: farmer._id.toString(),
    phone: farmer.phone,
    name: farmer.name
  };

  const options = {
    expiresIn: "7d",
    issuer: "fisheries-app",
    subject: farmer._id.toString()
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

router.get("/profile", FarmerAuth, async (req, res) => {
  try {
    const farmer = await FarmerLead.findById(req.farmer.id).select(
      "name phone email address farmSize farmType farmingExperience preferredFishType previousCrops notes"
    );

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    res.json({
      success: true,
      data: farmer,
    });
  } catch (error) {
    console.error("Error fetching farmer profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching farmer profile",
    });
  }
});

module.exports = router;