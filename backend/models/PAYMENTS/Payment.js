// backend/models/PAYMENTS/Payment.js
const mongoose = require("mongoose");

const PaymentSubmissionSchema = new mongoose.Schema({
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'submittedByModel'
    },
    submittedByModel: {
        type: String,
        required: true,
        enum: ['ProjectManagerEmployee', 'SalesEmployeeEmployee', 'TeamLeaderEmployee', 'HrEmployee', 'FarmerLead']
    },
    screenshot: {
        type: String, // Cloudinary URL
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ["UPI", "Bank Transfer", "Cash", "Cheque", "Other"]
    },
    transactionId: {
        type: String,
        trim: true
    },
    additionalNotes: {
        type: String,
        trim: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

const PaymentSchema = new mongoose.Schema({
    farmerLeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FarmerLead",
        required: true
    },
    projectManagerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProjectManagerEmployee",
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
    // Manual Payment Fields
    paymentSubmissions: [PaymentSubmissionSchema],
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
    // Hardcoded Payment Information (Set automatically from environment/config)
    paymentInfo: {
        upiIds: [{
            upiId: String,
            provider: String,
            qrCode: String // Cloudinary URL for QR code
        }],
        bankDetails: {
            accountNumber: String,
            accountName: String,
            bankName: String,
            ifscCode: String,
            branch: String
        },
        companyName: {
            type: String,
            default: "Your Company Name"
        }
    },
    // Verification
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProjectManagerEmployee"
    },
    verifiedAt: Date,
    verificationNotes: String,
    
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Pre-save middleware to automatically set payment info
PaymentSchema.pre('save', function(next) {
    if (this.isNew) {
        // Set hardcoded payment information from environment variables or config
        this.paymentInfo = {
            upiIds: [
                {
                    upiId: process.env.COMPANY_UPI_ID_1 || "digadarshana@okicici",
                    provider: "Company UPI 1",
                    qrCode: process.env.COMPANY_QR_CODE_1 || "https://relaxgroup.in/images/relax-qr-code.png"
                },
                {
                    upiId: process.env.COMPANY_UPI_ID_2 || "digadarshana@paytm",
                    provider: "Company UPI 2", 
                    qrCode: process.env.COMPANY_QR_CODE_2 || "https://relaxgroup.in/images/relax-qr-code.png"
                }
            ],
            bankDetails: {
                accountNumber: process.env.COMPANY_ACCOUNT_NUMBER || "11553211028857",
                accountName: process.env.COMPANY_ACCOUNT_NAME || "DIGA-DARSHANA SOLUTIONS PRIVATE LIMITED",
                bankName: process.env.COMPANY_BANK_NAME || "State Bank of India",
                ifscCode: process.env.COMPANY_IFSC_CODE || "SBIN0000123",
                branch: process.env.COMPANY_BRANCH || "Main Branch, Bhubaneswar"
            },
            companyName: process.env.COMPANY_NAME || "DIGA-DARSHANA SOLUTIONS PRIVATE LIMITED"
        };
    }
    next();
});

// Index for better query performance
PaymentSchema.index({ farmerLeadId: 1, createdAt: -1 });
PaymentSchema.index({ paymentStatus: 1 });
PaymentSchema.index({ "paymentSubmissions.submittedBy": 1 });

module.exports = mongoose.model("Payment", PaymentSchema);