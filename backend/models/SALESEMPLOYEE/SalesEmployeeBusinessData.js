const mongoose = require("mongoose")

const SalesEmployeeBusinessDataSchema = new mongoose.Schema({
  // Employee Reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SalesEmployeeEmployee",
    required: true,
    unique: true,
  },
  empCode: {
    type: String,
    required: true,
    unique: true,
  },

  // Employment Details
  employeeType: {
    type: String,
    enum: ["full-time", "part-time", "contract", "intern"],
    default: "full-time",
  },
  department: {
    type: String,
    default: "Sales",
  },
  designation: {
    type: String,
    default: "Sales Executive",
  },
  joiningDate: {
    type: Date,
    required: true,
  },
  salary: {
    type: Number,
    required: true,
    min: 0,
  },

  // Sales Specific Fields
  assignedZone: {
    type: String,
    required: true,
  },
  monthlyTarget: {
    type: Number,
    required: true,
    min: 0,
  },

  // Department Status
  deptStatus: {
    type: String,
    enum: ["active", "inactive", "on-leave", "terminated"],
    default: "active",
  },

  // Management
  probationPeriod: {
    type: Number, // in months
    default: 6,
  },
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HrEmployee",
    required: true,
  },

  // Performance Metrics
  currentMonthSales: {
    type: Number,
    default: 0,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  targetAchievementRate: {
    type: Number,
    default: 0, // percentage
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

module.exports = mongoose.model("SalesEmployeeBusinessData", SalesEmployeeBusinessDataSchema)
