const mongoose = require("mongoose")

const ProjectManagerBusinessDataSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProjectManagerEmployee",
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
    default: "Project Management",
  },
  designation: {
    type: String,
    default: "Project Manager",
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
  teamSize: {
    type: Number,
    default: 0,
  },
  assignedDomain: {
    type: String,
    default: "",
  },

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

  // Project Targets
  monthlyProjectTarget: {
    type: Number,
    default: 0,
  },
  quarterlyProjectTarget: {
    type: Number,
    default: 0,
  },
  annualProjectTarget: {
    type: Number,
    default: 0,
  },
  activeProjects: {
    type: Number,
    default: 0,
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

module.exports = mongoose.model("ProjectManagerBusinessData", ProjectManagerBusinessDataSchema)
