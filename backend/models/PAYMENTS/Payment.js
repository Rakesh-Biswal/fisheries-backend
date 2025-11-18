// backend/models/PAYMENTS/Payment.js
const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
    farmerLeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FarmerLead",
        required: true
    },
    projectManagerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    paymentTitle: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    requirements: [{
        description: String,
        isCompleted: {
            type: Boolean,
            default: false
        },
        completedAt: Date
    }],
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    reasonForPayment: {
        type: String,
        required: true,
        trim: true
    },
    razorpayOrderId: {
        type: String,
        sparse: true
    },
    razorpayPaymentId: {
        type: String,
        sparse: true
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Processing", "Completed", "Failed", "Cancelled"],
        default: "Pending"
    },
    workStatus: {
        type: String,
        enum: ["Not Started", "In Progress", "Completed", "Verified"],
        default: "Not Started"
    },
    isStep1Completed: {
        type: Boolean,
        default: false
    },
    isStep2Completed: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Index for better query performance
PaymentSchema.index({ farmerLeadId: 1, createdAt: -1 });
PaymentSchema.index({ paymentStatus: 1 });
PaymentSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model("Payment", PaymentSchema);