const mongoose = require("mongoose")

const AccountantEmployeeSchema = new mongoose.Schema({
  // Personal Information
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  companyEmail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  personalEmail: {
    type: String,
    lowercase: true,
    trim: true,
  },

  // Identification Documents
  aadhar: {
    type: String,
    required: true,
    unique: true,
  },
  pan: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  photo: {
    type: String, // URL from Cloudflare R2
    default: null,
  },

  // Address Information
  address: {
    type: String,
    required: true,
  },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String,
  },

  // Qualifications & Experience
  qualification: {
    type: String,
    default: "",
  },
  experience: {
    type: Number,
    default: 0,
  },
  previousCompany: {
    type: String,
    default: "",
  },

  // Accounting Specialization
  specialization: {
    type: String,
    default: "General",
  },
  certifications: [
    {
      type: String,
      trim: true,
    },
  ],

  // Banking Information
  bankAccount: {
    accountNumber: {
      type: String,
      required: true,
    },
    ifscCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
  },

  // System Generated
  empCode: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active",
  },
  role: {
    type: String,
    default: "accountant",
  },

  // References
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HrEmployee",
    default: null,
  },

  businessData: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountantBusinessData",
    default: null,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("AccountantEmployee", AccountantEmployeeSchema)
