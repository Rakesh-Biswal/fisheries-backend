const express = require("express");
const router = express.Router();
const Payment = require("../../models/PAYMENTS/Payment");
const { ProjectManagerAuth } = require("../../middleware/authMiddleware");
const { sendPaymentStatusEmail } = require("../../lib/emailService");

// Apply project manager auth middleware to all routes
router.use(ProjectManagerAuth);

// Create payment
router.post("/create", async (req, res) => {
  try {
    const {
      farmerLeadId,
      paymentTitle,
      description,
      requirements,
      amount,
      reasonForPayment,
    } = req.body;

    // Get user from request (already authenticated by middleware)
    const user = req.projectManager;

    // Validate required fields
    if (
      !farmerLeadId ||
      !paymentTitle ||
      !description ||
      !amount ||
      !reasonForPayment
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const payment = new Payment({
      farmerLeadId,
      projectManagerId: user.id,
      paymentTitle,
      description,
      requirements: requirements || [],
      amount: parseFloat(amount),
      reasonForPayment,
    });

    await payment.save();

    res.json({
      success: true,
      message: "Payment created successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment",
      error: error.message,
    });
  }
});

// Submit payment screenshot and details
router.post("/:paymentId/submit-payment", async (req, res) => {
  try {
    const { screenshot, paymentMethod, transactionId, additionalNotes } =
      req.body;

    // Get user from request (already authenticated by middleware)
    const user = req.projectManager;

    // Validate required fields
    if (!screenshot || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: screenshot, paymentMethod",
      });
    }

    const payment = await Payment.findById(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Create payment submission with user info
    const paymentSubmission = {
      submittedBy: user.id,
      submittedByModel: "ProjectManagerEmployee",
      screenshot,
      paymentMethod,
      transactionId: transactionId || "",
      additionalNotes: additionalNotes || "",
      submittedAt: new Date(),
    };

    payment.paymentSubmissions.push(paymentSubmission);
    payment.paymentStatus = "Processing";
    await payment.save();

    // Populate the submission for response
    await payment.populate("paymentSubmissions.submittedBy", "name email role");

    res.json({
      success: true,
      message: "Payment submission received successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error submitting payment:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting payment",
      error: error.message,
    });
  }
});

// Update payment status (for Project Manager) - WITH EMAIL NOTIFICATION
router.patch("/:paymentId/status", async (req, res) => {
  try {
    const { paymentStatus, workStatus, verificationNotes } = req.body;

    // Get user from request (already authenticated by middleware)
    const user = req.projectManager;

    const payment = await Payment.findById(req.params.paymentId).populate(
      "farmerLeadId",
      "name email phone"
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const updateData = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (workStatus) updateData.workStatus = workStatus;
    if (verificationNotes) updateData.verificationNotes = verificationNotes;

    // If status is being set to Completed, record verification details
    if (paymentStatus === "Completed") {
      updateData.verifiedBy = user.id;
      updateData.verifiedAt = new Date();
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.paymentId,
      updateData,
      { new: true }
    )
      .populate("farmerLeadId", "name email phone")
      .populate("verifiedBy", "name email")
      .populate("paymentSubmissions.submittedBy", "name email phone role");

    // Send email notification to farmer if status changed and farmer has email
    if (paymentStatus && payment.farmerLeadId && payment.farmerLeadId.email) {
      try {
        await sendPaymentStatusEmail(
          payment.farmerLeadId.email,
          payment.farmerLeadId.name,
          payment.paymentTitle,
          paymentStatus,
          verificationNotes || "No additional notes provided.",
          payment.amount
        );
        console.log(
          `✅ Payment status email sent to ${payment.farmerLeadId.email}`
        );
      } catch (emailError) {
        console.error("❌ Failed to send payment status email:", emailError);
        // Don't fail the request if email fails - just log it
      }
    }

    res.json({
      success: true,
      message: "Payment status updated successfully",
      data: updatedPayment,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payment status",
      error: error.message,
    });
  }
});

// Get payment details by ID
router.get("/:paymentId", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate("farmerLeadId", "name phone email")
      .populate("projectManagerId", "name email")
      .populate("paymentSubmissions.submittedBy", "name email phone role")
      .populate("verifiedBy", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    console.log("Fetched payment details for:", payment.paymentTitle);

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment details",
      error: error.message,
    });
  }
});

// Get payments for a farmer
router.get("/farmer/:farmerId", async (req, res) => {
  try {
    const payments = await Payment.find({ farmerLeadId: req.params.farmerId })
      .sort({ createdAt: -1 })
      .populate("projectManagerId", "name email")
      .populate("verifiedBy", "name email");

    res.json({
      success: true,
      data: payments,
      count: payments.length,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payments",
      error: error.message,
    });
  }
});

// Get all payments for project manager
router.get("/", async (req, res) => {
  try {
    const user = req.projectManager;

    const payments = await Payment.find({ projectManagerId: user.id })
      .populate("farmerLeadId", "name phone email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments,
      count: payments.length,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payments",
      error: error.message,
    });
  }
});

module.exports = router;
