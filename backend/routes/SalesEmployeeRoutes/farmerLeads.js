const express = require("express");
const router = express.Router();
const FarmerLead = require("../../models/SALESEMPLOYEE/farmerLeads");
const FarmerLand_II = require("../../models/SALESEMPLOYEE/farmerLeads_II");
const { SalesEmployeeAuth } = require("../../middleware/authMiddleware");
const { sendFarmerWelcomeEmail } = require("../../lib/emailService");

// Helper function to generate random password
const generateTemporaryPassword = () => {
  const length = 8;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

router.get("/test-email", SalesEmployeeAuth, async (req, res) => {
  try {
    const testResult = await testEmailService();
    res.json(testResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create new farmer lead - ENHANCED EMAIL HANDLING
router.post("/farmer-leads", SalesEmployeeAuth, async (req, res) => {
  try {
    const {
      name,
      address,
      phone,
      email,
      age,
      gender,
      farmSize,
      farmType,
      farmingExperience,
      previousCrops,
      preferredFishType,
      notes,
      taskId,
      submissionLocation,
      salesEmployeePhotos,
      nextFollowUpDate,
    } = req.body;

    console.log("📥 Received farmer lead submission");

    // Enhanced validation for required fields
    const requiredFields = {
      name: "Farmer name",
      address: "Address",
      phone: "Phone number",
    };

    const missingFields = [];
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field].trim() === "") {
        missingFields.push(label);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate phone format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ""))) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number",
      });
    }

    // Validate email format if provided
    if (email && email.trim() !== "") {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }
    }

    // Validate location
    if (
      !submissionLocation ||
      !submissionLocation.latitude ||
      !submissionLocation.longitude
    ) {
      return res.status(400).json({
        success: false,
        message: "Location is required",
      });
    }

    // Validate photos
    if (!salesEmployeePhotos || salesEmployeePhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one proof photo is required",
      });
    }

    if (salesEmployeePhotos.length > 4) {
      return res.status(400).json({
        success: false,
        message: "Maximum 4 photos allowed",
      });
    }

    // Check if phone already exists
    const existingFarmer = await FarmerLead.findOne({
      phone: phone.replace(/\D/g, ""),
    });

    if (existingFarmer) {
      return res.status(400).json({
        success: false,
        message: "A farmer with this phone number already exists",
      });
    }

    // Check if email already exists (if provided)
    if (email && email.trim() !== "") {
      const existingEmail = await FarmerLead.findOne({
        email: email.toLowerCase().trim(),
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "A farmer with this email already exists",
        });
      }
    }

    // Rest of the code remains the same...
    const temporaryPassword = generateTemporaryPassword();

    const farmerLead = new FarmerLead({
      name: name.trim(),
      address: address.trim(),
      phone: phone.replace(/\D/g, ""),
      email: email ? email.toLowerCase().trim() : undefined,
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
      farmSize: farmSize ? farmSize.trim() : undefined,
      farmType: farmType ? farmType.trim() : undefined,
      farmingExperience: farmingExperience
        ? parseInt(farmingExperience)
        : undefined,
      previousCrops: previousCrops || [],
      preferredFishType: preferredFishType
        ? preferredFishType.trim()
        : undefined,
      notes: notes ? notes.trim() : undefined,
      taskId: taskId,
      submissionLocation,
      salesEmployeePhotos,
      salesEmployeeId: req.salesEmployee.id,
      nextFollowUpDate: nextFollowUpDate
        ? new Date(nextFollowUpDate)
        : undefined,
      salesEmployeeApproved: true,
      temporaryPassword,
    });

    await farmerLead.save();

    console.log(
      `✅ New farmer lead created by ${req.salesEmployee.name}: ${name}`
    );
    console.log(`📝 Lead ID: ${farmerLead._id}`);
    console.log(`🔐 Temporary Password: ${temporaryPassword}`);
    if (taskId) console.log(`📋 Associated with task: ${taskId}`);
    if (nextFollowUpDate) console.log(`🔔 Next follow-up: ${nextFollowUpDate}`);

    // Enhanced email sending with better error handling
    let emailStatus = "not_sent";
    let emailError = null;

    if (email) {
      try {
        console.log(`📧 Attempting to send welcome email to: ${email}`);

        await sendFarmerWelcomeEmail(email, name, phone, temporaryPassword);
        emailStatus = "sent";
        console.log(`✅ Welcome email sent successfully to: ${email}`);
      } catch (emailError) {
        emailStatus = "failed";
        emailError = emailError.message;
        console.error(
          `❌ Failed to send welcome email to ${email}:`,
          emailError
        );

        // Don't fail the whole request if email fails, but log it
        console.log(
          "⚠️ Farmer lead created successfully, but email failed. Continuing..."
        );
      }
    } else {
      emailStatus = "no_email";
      console.log("ℹ️ No email provided, skipping welcome email");
    }

    // Prepare response with email status
    const response = {
      success: true,
      message: "Farmer lead created successfully",
      data: {
        ...farmerLead.toObject(),
        emailStatus: {
          status: emailStatus,
          message:
            emailStatus === "sent"
              ? "Welcome email sent successfully"
              : emailStatus === "failed"
              ? `Email failed: ${emailError}`
              : emailStatus === "no_email"
              ? "No email provided"
              : "Unknown status",
        },
      },
    };

    // Add email warning if email failed
    if (emailStatus === "failed") {
      response.warning = "Farmer lead created but welcome email failed to send";
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Error creating farmer lead:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `A farmer with this ${field} already exists`,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while creating farmer lead",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get farmer leads for sales employee
router.get("/farmer-leads", SalesEmployeeAuth, async (req, res) => {
  try {
    const farmerLeads = await FarmerLead.find({
      salesEmployeeId: req.salesEmployee.id,
    }).sort({ createdAt: -1 });

    console.log(
      `📊 Found ${farmerLeads.length} farmer leads for user ${req.salesEmployee.id}`
    );

    res.json({
      success: true,
      data: farmerLeads,
    });
  } catch (error) {
    console.error("❌ Error fetching farmer leads:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching farmer leads",
    });
  }
});

// Get all clients with progress
router.get(
  "/farmer-leads/clients/progress",
  SalesEmployeeAuth,
  async (req, res) => {
    try {
      const farmerLeads = await FarmerLead.find({
        salesEmployeeId: req.salesEmployee.id,
      }).sort({ createdAt: -1 });

      const clientsWithProgress = await Promise.all(
        farmerLeads.map(async (lead) => {
          const intermediate = await FarmerLand_II.findOne({
            farmerLeadId: lead._id,
          });

          let stage = "basic";
          let completed = false;

          if (intermediate) {
            stage = "intermediate";
            // Add advanced check when available
            // if (advanced) {
            //   stage = "advanced";
            //   completed = true;
            // }
          }

          return {
            _id: lead._id,
            name: lead.name,
            phone: lead.phone,
            address: lead.address,
            createdAt: lead.createdAt,
            progress: {
              stage,
              completed,
            },
          };
        })
      );

      res.json({
        success: true,
        data: clientsWithProgress,
      });
    } catch (error) {
      console.error("Error fetching clients progress:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching clients",
      });
    }
  }
);

router.get("/farmer-leads/clients/:id", SalesEmployeeAuth, async (req, res) => {
  try {
    console.log("🔍 Fetching client details for ID:", req.params.id);
    console.log("👤 Sales Employee ID:", req.salesEmployee.id);

    const farmerLead = await FarmerLead.findOne({
      _id: req.params.id,
      salesEmployeeId: req.salesEmployee.id,
    });

    if (!farmerLead) {
      console.log("❌ Farmer lead not found or access denied");
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    console.log("✅ Farmer lead found:", farmerLead.name);

    // Check for intermediate data
    let intermediate = null;
    try {
      intermediate = await FarmerLand_II.findOne({
        farmerLeadId: farmerLead._id,
      });
      console.log("📊 Intermediate data found:", !!intermediate);
    } catch (intermediateError) {
      console.log(
        "ℹ️ No intermediate data found or FarmerLand_II not available"
      );
      // Continue without intermediate data
    }

    let stage = "basic";
    let hasIntermediate = !!intermediate;
    let hasAdvanced = false;
    let completed = false;
    let nextStep = "intermediate";

    if (intermediate) {
      stage = "intermediate";
      nextStep = "advanced";
    }

    // When advanced is implemented:
    // if (advanced) {
    //   stage = "advanced";
    //   hasAdvanced = true;
    //   completed = true;
    //   nextStep = "completed";
    // }

    const clientDetails = {
      ...farmerLead.toObject(),
      progress: {
        stage,
        completed,
        hasIntermediate,
        hasAdvanced,
      },
      intermediateData: intermediate,
      nextStep,
    };

    console.log(`✅ Client details prepared for: ${farmerLead.name}`);
    res.json({
      success: true,
      data: clientDetails,
    });
  } catch (error) {
    console.error("❌ Error fetching client details:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching client details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Create land details
router.post(
  "/farmer-leads/land-details",
  SalesEmployeeAuth,
  async (req, res) => {
    try {
      const {
        farmerLeadId,
        landOwner,
        khatiyanNo,
        plotNo,
        plotArea,
        landOwnerRelation,
        documents,
        landLocation,
      } = req.body;

      console.log("📥 Received land details submission");
      console.log("📋 Data received:", {
        farmerLeadId,
        landOwner,
        khatiyanNo,
        plotNo,
        plotArea,
        landOwnerRelation,
        documentCount: documents ? Object.keys(documents).length : 0,
        location: landLocation,
      });

      // Validate required fields
      if (!farmerLeadId || !landOwner || !khatiyanNo || !plotNo || !plotArea) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Check if farmer lead exists and belongs to this sales employee
      const farmerLead = await FarmerLead.findOne({
        _id: farmerLeadId,
        salesEmployeeId: req.salesEmployee.id,
      });

      if (!farmerLead) {
        return res.status(404).json({
          success: false,
          message: "Farmer lead not found or access denied",
        });
      }

      // Check if land details already exist
      const existingLandDetails = await FarmerLand_II.findOne({ farmerLeadId });
      if (existingLandDetails) {
        return res.status(400).json({
          success: false,
          message: "Land details already submitted for this client",
        });
      }

      const landDetails = new FarmerLand_II({
        farmerLeadId,
        landOwner,
        khatiyanNo,
        plotNo,
        plotArea,
        landOwnerRelation,
        documents: documents || {},
        landLocation,
      });

      await landDetails.save();

      console.log(`✅ Land details created for farmer lead: ${farmerLeadId}`);
      console.log(`📝 Land Details ID: ${landDetails._id}`);

      res.json({
        success: true,
        message: "Land details submitted successfully",
        data: landDetails,
      });
    } catch (error) {
      console.error("❌ Error creating land details:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating land details",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Check if farmer exists (for OTP login)
router.get("/check-farmer", async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    console.log(`🔍 Checking farmer existence for phone: ${phone}`);

    // Find farmer by phone number
    const farmer = await FarmerLead.findOne({
      phone: phone,
      // Add approval checks if needed
      // teamLeaderApproved: true,
      // hrApproved: true
    }).select(
      "name phone address createdAt farmSize farmType farmingExperience"
    );

    if (farmer) {
      console.log(`✅ Farmer found: ${farmer.name} (${farmer.phone})`);

      return res.json({
        success: true,
        exists: true,
        farmer: {
          id: farmer._id,
          name: farmer.name,
          phone: farmer.phone,
          address: farmer.address,
          farmSize: farmer.farmSize,
          farmType: farmer.farmType,
          farmingExperience: farmer.farmingExperience,
          joinedDate: farmer.createdAt,
        },
      });
    } else {
      console.log(`❌ No farmer found with phone: ${phone}`);

      return res.json({
        success: true,
        exists: false,
        message:
          "No farmer account found with this phone number. Please contact your sales representative.",
      });
    }
  } catch (error) {
    console.error("❌ Error checking farmer:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while checking farmer account",
    });
  }
});

// Get land details for a specific farmer lead
router.get(
  "/land-details/:farmerLeadId",
  SalesEmployeeAuth,
  async (req, res) => {
    try {
      const { farmerLeadId } = req.params;

      // Check if farmer lead exists and belongs to this sales employee
      const farmerLead = await FarmerLead.findOne({
        _id: farmerLeadId,
        salesEmployeeId: req.salesEmployee.id,
      });

      if (!farmerLead) {
        return res.status(404).json({
          success: false,
          message: "Farmer lead not found or access denied",
        });
      }

      const landDetails = await FarmerLand_II.findOne({ farmerLeadId });

      if (!landDetails) {
        return res.status(404).json({
          success: false,
          message: "Land details not found for this client",
        });
      }

      res.json({
        success: true,
        data: landDetails,
      });
    } catch (error) {
      console.error("Error fetching land details:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching land details",
      });
    }
  }
);

module.exports = router;
