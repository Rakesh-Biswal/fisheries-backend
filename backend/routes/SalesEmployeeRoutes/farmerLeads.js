const express = require("express");
const router = express.Router();
const FarmerLead = require("../../models/SALESEMPLOYEE/farmerLeads");
const FarmerLand_II = require("../../models/SALESEMPLOYEE/farmerLeads_II");
const { SalesEmployeeAuth } = require("../../middleware/authMiddleware");

// Create new farmer lead - FIXED AUTH
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
    console.log("👤 Sales Employee:", req.salesEmployee);
    console.log("📋 Data received:", {
      name,
      phone,
      address: address ? `${address.substring(0, 50)}...` : "empty",
      location: submissionLocation,
      photoCount: salesEmployeePhotos ? salesEmployeePhotos.length : 0,
      taskId: taskId || "Not provided",
      nextFollowUpDate: nextFollowUpDate || "Not set",
    });

    // Basic validation for required fields
    if (!name || !address || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, address, and phone are required fields",
      });
    }

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

    if (!salesEmployeePhotos || salesEmployeePhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one proof photo is required",
      });
    }

    // Check if sales employee info is available
    if (!req.salesEmployee || !req.salesEmployee.id) {
      return res.status(401).json({
        success: false,
        message: "Sales employee authentication failed",
      });
    }

    // Create new farmer lead
    const farmerLead = new FarmerLead({
      name,
      address,
      phone,
      email: email || undefined,
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
      farmSize: farmSize || undefined,
      farmType: farmType || undefined,
      farmingExperience: farmingExperience
        ? parseInt(farmingExperience)
        : undefined,
      previousCrops: previousCrops || [],
      preferredFishType: preferredFishType || undefined,
      notes: notes || undefined,
      taskId: taskId,
      submissionLocation,
      salesEmployeePhotos,
      salesEmployeeId: req.salesEmployee.id, // Use the authenticated sales employee ID
      nextFollowUpDate: nextFollowUpDate
        ? new Date(nextFollowUpDate)
        : undefined,
      salesEmployeeApproved: true, // Auto-approve by sales employee
    });

    await farmerLead.save();

    console.log(
      `✅ New farmer lead created by ${req.salesEmployee.name}: ${name}`
    );
    console.log(`📝 Lead ID: ${farmerLead._id}`);
    if (taskId) console.log(`📋 Associated with task: ${taskId}`);
    if (nextFollowUpDate) console.log(`🔔 Next follow-up: ${nextFollowUpDate}`);

    res.json({
      success: true,
      message: "Farmer lead created successfully",
      data: farmerLead,
    });
  } catch (error) {
    console.error("❌ Error creating farmer lead:", error);
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
router.get("/clients/progress", SalesEmployeeAuth, async (req, res) => {
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
});

// Get client details with all data
router.get("/clients/:id", SalesEmployeeAuth, async (req, res) => {
  try {
    const farmerLead = await FarmerLead.findOne({
      _id: req.params.id,
      salesEmployeeId: req.salesEmployee.id,
    });

    if (!farmerLead) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const intermediate = await FarmerLand_II.findOne({
      farmerLeadId: farmerLead._id,
    });

    let stage = "basic";
    let hasIntermediate = !!intermediate;
    let hasAdvanced = false; // Will update when advanced form is implemented
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

    res.json({
      success: true,
      data: clientDetails,
    });
  } catch (error) {
    console.error("Error fetching client details:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching client details",
    });
  }
});

// Create land details
router.post("/land-details", SalesEmployeeAuth, async (req, res) => {
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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
