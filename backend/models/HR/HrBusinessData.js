const mongoose = require("mongoose")

const hrBusinessDataSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HrEmployee",
      required: true,
    },
    empCode: {
      type: String,
      required: true,
    },
    employeeType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "intern"],
      default: "full-time",
    },
    department: {
      type: String,
      default: "Human Resources",
    },
    designation: {
      type: String,
      default: "HR Executive",
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    deptStatus: {
      type: String,
      enum: ["active", "inactive", "on-leave"],
      default: "active",
    },
    attendanceSummary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSummary",
      default: null,
    },
    salaryStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructure",
      default: null,
    },
    probationPeriod: {
      type: Number,
      default: 6, // months
    },
    confirmationDate: {
      type: Date,
      default: null,
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    resignDate: {
      type: Date,
      default: null,
    },
    lastWorkingDay: {
      type: Date,
      default: null,
    },
    performanceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("HrBusinessData", hrBusinessDataSchema)
