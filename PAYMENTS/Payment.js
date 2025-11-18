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
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: [{
        description: String,
        isCompleted: { type: Boolean, default: false },
        completedAt: Date
    }],
    amount: {
        type: Number,
        required: true
    },
    reasonForPayment: {
        type: String,
        required: true
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("Payment", PaymentSchema);