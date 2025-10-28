// routes/SalesEmployeeRoutes/farmerLeads.js - FIXED VERSION
const express = require("express");
const router = express.Router();
const FarmerLead = require("../../models/SALESEMPLOYEE/farmerLeads");
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
      taskId: taskId || undefined,
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

module.exports = router;
