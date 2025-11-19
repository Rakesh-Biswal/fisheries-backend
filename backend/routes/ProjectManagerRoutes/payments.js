// backend/routes/ProjectManagerRoutes/payments.js
const express = require("express");
const router = express.Router();
const Payment = require("../../models/PAYMENTS/Payment");
const jwt = require("jsonwebtoken");

// Helper function to extract user from token
const getUserFromToken = (req) => {
    try {
        const token = req.cookies?.EmployeeToken || req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return null;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error("Token verification error:", error);
        return null;
    }
};

// Create payment
router.post("/create", async (req, res) => {
    try {
        const { 
            farmerLeadId, 
            paymentTitle, 
            description, 
            requirements, 
            amount, 
            reasonForPayment
        } = req.body;

        // Get user from token
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Validate required fields
        if (!farmerLeadId || !paymentTitle || !description || !amount || !reasonForPayment) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const payment = new Payment({
            farmerLeadId,
            projectManagerId: user.id, // Use authenticated user's ID
            paymentTitle,
            description,
            requirements: requirements || [],
            amount: parseFloat(amount),
            reasonForPayment
        });

        await payment.save();

        res.json({
            success: true,
            message: "Payment created successfully",
            data: payment
        });
    } catch (error) {
        console.error("Error creating payment:", error);
        res.status(500).json({
            success: false,
            message: "Error creating payment",
            error: error.message
        });
    }
});

// Submit payment screenshot and details
router.post("/:paymentId/submit-payment", async (req, res) => {
    try {
        const { 
            screenshot,
            paymentMethod,
            transactionId,
            additionalNotes
        } = req.body;

        // Get user from token
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Validate required fields
        if (!screenshot || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: screenshot, paymentMethod"
            });
        }

        const payment = await Payment.findById(req.params.paymentId);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        // Determine the user model based on role from token
        let submittedByModel;
        switch (user.role) {
            case 'project-manager':
                submittedByModel = 'ProjectManagerEmployee';
                break;
            case 'sales-employee':
                submittedByModel = 'SalesEmployeeEmployee';
                break;
            case 'teamleader':
                submittedByModel = 'TeamLeaderEmployee';
                break;
            case 'hr':
                submittedByModel = 'HrEmployee';
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid user role"
                });
        }

        // Create payment submission with user info from token
        const paymentSubmission = {
            submittedBy: user.id, // Use authenticated user's ID from token
            submittedByModel: submittedByModel,
            screenshot,
            paymentMethod,
            transactionId: transactionId || '',
            additionalNotes: additionalNotes || '',
            submittedAt: new Date()
        };

        payment.paymentSubmissions.push(paymentSubmission);
        payment.paymentStatus = "Processing"; // Move to processing when submission is received
        await payment.save();

        // Populate the submission for response
        await payment.populate('paymentSubmissions.submittedBy', 'name email role');

        res.json({
            success: true,
            message: "Payment submission received successfully",
            data: payment
        });
    } catch (error) {
        console.error("Error submitting payment:", error);
        res.status(500).json({
            success: false,
            message: "Error submitting payment",
            error: error.message
        });
    }
});

// Update payment status (for Project Manager)
router.patch("/:paymentId/status", async (req, res) => {
    try {
        const { 
            paymentStatus, 
            workStatus, 
            verificationNotes
        } = req.body;

        // Get user from token
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const updateData = {};
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (workStatus) updateData.workStatus = workStatus;
        if (verificationNotes) updateData.verificationNotes = verificationNotes;
        
        // If status is being set to Completed, record verification details with authenticated user
        if (paymentStatus === "Completed") {
            updateData.verifiedBy = user.id; // Use authenticated user's ID
            updateData.verifiedAt = new Date();
        }

        const payment = await Payment.findByIdAndUpdate(
            req.params.paymentId,
            updateData,
            { new: true }
        ).populate("paymentSubmissions.submittedBy", "name email phone role")
         .populate("verifiedBy", "name email")
         .populate("projectManagerId", "name email");

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        res.json({
            success: true,
            message: "Payment status updated successfully",
            data: payment
        });
    } catch (error) {
        console.error("Error updating payment status:", error);
        res.status(500).json({
            success: false,
            message: "Error updating payment status",
            error: error.message
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
                message: "Payment not found"
            });
        }

        console.log("Fetched payment details for ID & Name:", payment );

        res.json({
            success: true,
            data: payment
        });
    } catch (error) {
        console.error("Error fetching payment details:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching payment details",
            error: error.message
        });
    }
});

// Get payments for a farmer
router.get("/farmer/:farmerId", async (req, res) => {
    try {
        const payments = await Payment.find({ farmerLeadId: req.params.farmerId })
            .sort({ createdAt: -1 })
            .populate("projectManagerId", "name email");

        res.json({
            success: true,
            data: payments,
            count: payments.length
        });
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching payments",
            error: error.message
        });
    }
});

module.exports = router;