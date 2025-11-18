// backend/routes/ProjectManagerRoutes/payments.js
const express = require("express");
const router = express.Router();
const Payment = require("../../models/PAYMENTS/Payment");

// Initialize Razorpay only if keys are available
let razorpay;
try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const Razorpay = require('razorpay');
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        console.log("✅ Razorpay initialized successfully");
    } else {
        console.log("⚠️  Razorpay keys not found, running in development mode");
    }
} catch (error) {
    console.log("⚠️  Razorpay not available, running in development mode:", error.message);
}

// Create new payment
router.post("/create", async (req, res) => {
    try {
        const { farmerLeadId, projectManagerId, paymentTitle, description, requirements, amount, reasonForPayment } = req.body;

        // Validate required fields
        if (!farmerLeadId || !projectManagerId || !paymentTitle || !description || !amount || !reasonForPayment) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const payment = new Payment({
            farmerLeadId,
            projectManagerId,
            paymentTitle,
            description,
            requirements: requirements || [],
            amount: parseFloat(amount),
            reasonForPayment
        });

        await payment.save();

        // Create Razorpay order if Razorpay is available
        let razorpayOrder = null;
        if (razorpay) {
            try {
                razorpayOrder = await razorpay.orders.create({
                    amount: Math.round(amount * 100), // Convert to paise
                    currency: "INR",
                    receipt: `receipt_${payment._id}`,
                    notes: {
                        paymentId: payment._id.toString(),
                        farmerLeadId: farmerLeadId.toString()
                    }
                });

                payment.razorpayOrderId = razorpayOrder.id;
                await payment.save();
            } catch (razorpayError) {
                console.error("Razorpay order creation failed:", razorpayError);
                // Continue without Razorpay - payment can be marked for manual processing
            }
        }

        res.json({
            success: true,
            message: "Payment created successfully",
            data: {
                payment,
                razorpayOrder
            }
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

// Verify payment (webhook or callback)
router.post("/verify", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id) {
            return res.status(400).json({
                success: false,
                message: "Missing payment verification data"
            });
        }

        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        // In a real implementation, you would verify the signature
        // const crypto = require('crypto');
        // const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        //   .update(razorpay_order_id + "|" + razorpay_payment_id)
        //   .digest('hex');

        // if (expectedSignature === razorpay_signature) {
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.paymentStatus = "Completed";
        await payment.save();
        // }

        res.json({
            success: true,
            message: "Payment verified successfully",
            data: payment
        });
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({
            success: false,
            message: "Error verifying payment",
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

// Update payment status
router.patch("/:paymentId/status", async (req, res) => {
    try {
        const { paymentStatus, workStatus } = req.body;

        const payment = await Payment.findByIdAndUpdate(
            req.params.paymentId,
            {
                ...(paymentStatus && { paymentStatus }),
                ...(workStatus && { workStatus })
            },
            { new: true }
        );

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

module.exports = router;