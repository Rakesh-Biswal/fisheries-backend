const mongoose = require("mongoose")

const AccountantBusinessDataSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountantEmployee",
    required: true,
  },
  empCode: {
    type: String,
    required: true,
  },

  // Employment Details
  employeeType: {
    type: String,
    enum: ["full-time", "part-time", "contract", "intern"],
    default: "full-time",
  },
  department: {
    type: String,
    default: "Finance",
  },
  designation: {
    type: String,
    default: "Accountant",
  },
  joiningDate: {
    type: Date,
    default: Date.now,
  },

  // Compensation
  salary: {
    type: Number,
    required: true,
  },
  salaryStructureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SalaryStructure",
    default: null,
  },

  // Management Structure
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HrEmployee",
    default: null,
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

  // Performance Metrics
  probationPeriod: {
    type: Number,
    default: 6, // months
  },
  deptStatus: {
    type: String,
    enum: ["active", "transfer", "resigned", "terminated"],
    default: "active",
  },
  attendanceSummary: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // Accounting Metrics
  clientsHandled: {
    type: Number,
    default: 0,
  },
  monthlyTransactions: {
    type: Number,
    default: 0,
  },
  accuracyRate: {
    type: Number,
    default: 100, // percentage
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

module.exports = mongoose.model("AccountantBusinessData", AccountantBusinessDataSchema)
