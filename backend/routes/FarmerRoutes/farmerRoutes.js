const express = require("express");
const router = express.Router();
const Payment = require("../../models/PAYMENTS/Payment");
const FarmerLead = require("../../models/SALESEMPLOYEE/farmerLeads");
const { FarmerAuth } = require("../../middleware/authMiddleware");

// Apply farmer auth middleware to all routes
router.use(FarmerAuth);

// ========== PROFILE ROUTES ==========

// Get farmer profile
router.get("/profile", async (req, res) => {
  try {
    const farmer = await FarmerLead.findById(req.farmer.id)
      .select("-temporaryPassword -salesEmployeeId -submissionLocation") // Hide sensitive fields
      .populate("salesEmployeeId", "name phone companyEmail");

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    // Get land details
    const FarmerLand_II = require("../../models/SALESEMPLOYEE/farmerLeads_II");
    const landDetails = await FarmerLand_II.findOne({
      farmerLeadId: req.farmer.id,
    });

    // Get approval status details
    const approvalStatus = {
      salesEmployeeApproved: farmer.salesEmployeeApproved,
      teamLeaderApproved: farmer.teamLeaderApproved,
      hrApproved: farmer.hrApproved,
      overallStatus:
        farmer.salesEmployeeApproved &&
        farmer.teamLeaderApproved &&
        farmer.hrApproved
          ? "Fully Approved"
          : "Pending Approval",
    };

    res.json({
      success: true,
      data: {
        ...farmer.toObject(),
        landDetails: landDetails || null,
        approvalStatus,
        submissionInfo: {
          submissionDateTime: farmer.submissionDateTime,
          salesEmployeePhotos: farmer.salesEmployeePhotos,
          nextFollowUpDate: farmer.nextFollowUpDate,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching farmer profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching farmer profile",
    });
  }
});

// Enhanced Update farmer profile
router.put("/profile", async (req, res) => {
  try {
    const farmerId = req.farmer.id;
    const {
      email,
      address,
      farmSize,
      farmType,
      farmingExperience,
      preferredFishType,
      previousCrops,
      notes,
    } = req.body;

    // Fields that farmers are allowed to update
    const allowedUpdates = {
      email,
      address,
      farmSize,
      farmType,
      farmingExperience,
      preferredFishType,
      previousCrops,
      notes,
      updatedAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(allowedUpdates).forEach((key) => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    const updatedFarmer = await FarmerLead.findByIdAndUpdate(
      farmerId,
      allowedUpdates,
      { new: true, runValidators: true }
    ).select("-temporaryPassword -salesEmployeeId -submissionLocation");

    if (!updatedFarmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedFarmer,
    });
  } catch (error) {
    console.error("Error updating farmer profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
});
// Get farmer land details (from second form)
router.get("/land-details", async (req, res) => {
  try {
    const farmerId = req.farmer.id;

    const FarmerLand_II = require("../../models/SALESEMPLOYEE/farmerLeads_II");
    const landDetails = await FarmerLand_II.findOne({ farmerLeadId: farmerId });

    if (!landDetails) {
      return res.status(404).json({
        success: false,
        message: "Land details not found",
        data: null,
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
      message: "Error fetching land details",
    });
  }
});

// ========== DASHBOARD ROUTES ==========

// Get farmer dashboard stats
router.get("/dashboard/stats", async (req, res) => {
  try {
    const farmerId = req.farmer.id;

    const pendingPayments = await Payment.countDocuments({
      farmerLeadId: farmerId,
      paymentStatus: { $in: ["Pending", "Processing"] },
    });

    const completedPayments = await Payment.find({
      farmerLeadId: farmerId,
      paymentStatus: "Completed",
    });

    const totalPaid = completedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    // Find next due payment
    const nextDuePayment = await Payment.findOne({
      farmerLeadId: farmerId,
      paymentStatus: "Pending",
    }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        activeProjects: await Payment.countDocuments({
          farmerLeadId: farmerId,
        }),
        pendingPayments,
        totalPaid,
        nextDue: nextDuePayment ? nextDuePayment.amount : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
    });
  }
});

// Get farmer crops/fish (sample data)
router.get("/crops", async (req, res) => {
  try {
    // This would typically come from a separate Crops model
    // For now, returning sample data
    const crops = [
      {
        name: "Rice Paddy",
        type: "Crop",
        area: "2 acres",
        status: "growing",
        plantedDate: new Date("2024-01-15"),
        expectedHarvest: new Date("2024-04-15"),
      },
      {
        name: "Tilapia Fish",
        type: "Fish",
        area: "1 pond",
        status: "harvest-ready",
        plantedDate: new Date("2023-11-20"),
        expectedHarvest: new Date("2024-02-20"),
      },
    ];

    res.json({
      success: true,
      data: crops,
    });
  } catch (error) {
    console.error("Error fetching crops:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching crops",
    });
  }
});

// Get recent activities (sample data)
router.get("/activities/recent", async (req, res) => {
  try {
    // This would typically come from an Activities model
    const activities = [
      {
        title: "Watering completed",
        description: "Rice cultivation field watering",
        status: "completed",
        date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        title: "Fertilizer application",
        description: "Wheat field fertilizer needed",
        status: "pending",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        title: "Harvest preparation",
        description: "Vegetable garden harvest ready",
        status: "in-progress",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching activities",
    });
  }
});

// ========== PAYMENT ROUTES ==========

// Get pending payments for farmer
router.get("/payments/pending", async (req, res) => {
  try {
    const farmerId = req.farmer.id;

    const payments = await Payment.find({
      farmerLeadId: farmerId,
      paymentStatus: { $in: ["Pending", "Processing"] },
    })
      .populate("projectManagerId", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payments",
    });
  }
});

// Get payment history for farmer
router.get("/payments/history", async (req, res) => {
  try {
    const farmerId = req.farmer.id;
    const { filter } = req.query;

    let query = { farmerLeadId: farmerId };

    if (filter && filter !== "all") {
      query.paymentStatus = filter;
    }

    const payments = await Payment.find(query)
      .populate("projectManagerId", "name email phone")
      .populate("verifiedBy", "name email")
      .populate("paymentSubmissions.submittedBy", "name email role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment history",
    });
  }
});

// Get recent payments for dashboard
router.get("/payments/recent", async (req, res) => {
  try {
    const farmerId = req.farmer.id;

    const payments = await Payment.find({ farmerLeadId: farmerId })
      .select("paymentTitle amount paymentStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching recent payments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent payments",
    });
  }
});

// Get specific payment by ID for farmer
router.get("/payments/:paymentId", async (req, res) => {
  try {
    const farmerId = req.farmer.id;
    const paymentId = req.params.paymentId;

    const payment = await Payment.findOne({
      _id: paymentId,
      farmerLeadId: farmerId,
    })
      .populate("projectManagerId", "name email phone")
      .populate("verifiedBy", "name email")
      .populate("paymentSubmissions.submittedBy", "name email role");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment",
    });
  }
});

// Submit payment proof
router.post("/payments/:paymentId/submit", async (req, res) => {
  try {
    const { screenshot, paymentMethod, transactionId, additionalNotes } =
      req.body;
    const farmerId = req.farmer.id;

    if (!screenshot || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Screenshot and payment method are required",
      });
    }

    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      farmerLeadId: farmerId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const paymentSubmission = {
      submittedBy: farmerId,
      submittedByModel: "FarmerLead",
      screenshot,
      paymentMethod,
      transactionId: transactionId || "",
      additionalNotes: additionalNotes || "",
      submittedAt: new Date(),
    };

    payment.paymentSubmissions.push(paymentSubmission);
    payment.paymentStatus = "Processing";
    await payment.save();

    // Populate for response
    await payment.populate(
      "paymentSubmissions.submittedBy",
      "name email phone"
    );

    res.json({
      success: true,
      message: "Payment proof submitted successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error submitting payment proof:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting payment proof",
    });
  }
});

module.exports = router;
