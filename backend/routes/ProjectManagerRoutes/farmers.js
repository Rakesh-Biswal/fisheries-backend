// backend/routes/ProjectManagerRoutes/farmers.js
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const FarmerLead = require("../../models/SALESEMPLOYEE/farmerLeads");
const FarmerLand_II = require("../../models/SALESEMPLOYEE/farmerLeads_II");
const Payment = require("../../models/PAYMENTS/Payment");

// Get all farmers for PM dashboard - FIXED VERSION
router.get("/", async (req, res) => {
    try {
        const farmers = await FarmerLead.find()
            // Remove populate if User model doesn't exist, or use the correct field
            .select("name phone email farmSize farmType preferredFishType createdAt salesEmployeeApproved teamLeaderApproved hrApproved salesEmployeeId")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: farmers,
            count: farmers.length
        });
    } catch (error) {
        console.error("Error fetching farmers:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching farmers data",
            error: error.message
        });
    }
});

// Get single farmer details with step completion status - FIXED VERSION
router.get("/:id", async (req, res) => {
    try {
        const farmerId = req.params.id;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(farmerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid farmer ID format"
            });
        }

        console.log("Fetching farmer with ID:", farmerId);

        // Remove populate to avoid User model dependency
        const farmer = await FarmerLead.findById(farmerId);

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });
        }

        console.log("Found farmer:", farmer.name);

        const step2Data = await FarmerLand_II.findOne({ farmerLeadId: farmerId });
        const payments = await Payment.find({ farmerLeadId: farmerId }).sort({ createdAt: -1 });

        // Check step completion
        const isStep1Completed = farmer.salesEmployeeApproved && farmer.teamLeaderApproved && farmer.hrApproved;
        const isStep2Completed = step2Data && step2Data.documentStatus === "Approved";

        res.json({
            success: true,
            data: {
                farmer,
                step2Data: step2Data || null,
                payments,
                stepCompletion: {
                    step1: isStep1Completed,
                    step2: isStep2Completed,
                    canMakePayment: isStep1Completed && isStep2Completed
                }
            }
        });
    } catch (error) {
        console.error("Error fetching farmer details:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching farmer details",
            error: error.message
        });
    }
});

// Test endpoint to check farmer data
router.get("/test/:id", async (req, res) => {
    try {
        const farmerId = req.params.id;

        console.log("Testing farmer ID:", farmerId);

        // Test if farmer exists
        const farmerExists = await FarmerLead.exists({ _id: farmerId });
        console.log("Farmer exists:", farmerExists);

        // Test farmer data
        const farmer = await FarmerLead.findById(farmerId);
        console.log("Farmer data:", farmer);

        res.json({
            success: true,
            farmerExists: !!farmerExists,
            farmer: farmer,
            totalFarmers: await FarmerLead.countDocuments()
        });
    } catch (error) {
        console.error("Test error:", error);
        res.status(500).json({
            success: false,
            message: "Test failed",
            error: error.message
        });
    }
});

module.exports = router;