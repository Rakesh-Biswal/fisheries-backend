// backend/routes/FarmerRoutes/FarmerLogin.js
const express = require("express");
const router = express.Router();
const FarmerLead = require("../../models/SALESEMPLOYEE/farmerLeads");

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

    // Validate phone number format (10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number"
      });
    }

    // Check if farmer exists in database
    const farmer = await FarmerLead.findOne({ phone });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number. Please contact our sales team."
      });
    }

    // Check if farmer is approved (all three approvals)
    const isApproved = farmer.salesEmployeeApproved && 
                      farmer.teamLeaderApproved && 
                      farmer.hrApproved;

    if (!isApproved) {
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval. Please contact our sales team."
      });
    }

    // If farmer exists and is approved, return success
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

    // Import Firebase Admin dynamically (since it's server-side only)
    const { verifyFirebaseIdToken } = await import('../../lib/firebaseAdmin.js');

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(idToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }

    // Check if the phone number in token matches the requested phone
    const tokenPhone = decodedToken.phone_number;
    const formattedRequestPhone = formatPhoneNumber(phone);
    
    if (tokenPhone !== formattedRequestPhone) {
      return res.status(401).json({
        success: false,
        message: "Phone number mismatch"
      });
    }

    // Check if farmer exists
    const farmer = await FarmerLead.findOne({ phone });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    // Generate session token (you can use JWT)
    const token = generateFarmerToken(farmer);

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

// Helper function to format phone number
function formatPhoneNumber(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

// Helper function to generate farmer token
function generateFarmerToken(farmer) {
  // Implement JWT token generation
  // For now, return a simple token
  return `farmer-token-${farmer._id}-${Date.now()}`;
}

module.exports = router;