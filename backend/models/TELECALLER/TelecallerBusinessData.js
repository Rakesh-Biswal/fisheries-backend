const mongoose = require("mongoose")

const TelecallerBusinessDataSchema = new mongoose.Schema({
  // Employee Reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TelecallerEmployee",
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
    default: "Customer Service",
  },
  designation: {
    type: String,
    default: "Telecaller",
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

  shift: {
    type: String,
    enum: ["morning", "evening", "night", "rotational"],
    required: true,
  },
  dailyCallTarget: {
    type: Number,
    default: 0,
    min: 0,
  },
  specialization: {
    type: String,
    enum: [
      "inbound-sales",
      "outbound-sales",
      "customer-support",
      "lead-generation",
      "appointment-setting",
      "survey-research",
    ],
    default: "",
  },

  // Performance Metrics
  totalCallsMade: {
    type: Number,
    default: 0,
  },
  successfulCalls: {
    type: Number,
    default: 0,
  },
  conversionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // Status & Management
  deptStatus: {
    type: String,
    enum: ["active", "inactive", "on-leave", "terminated"],
    default: "active",
  },
  probationPeriod: {
    type: Number,
    default: 3, // months
  },
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HrEmployee",
    required: true,
  },

  // Additional Information
  notes: {
    type: String,
    default: "",
  },
  lastPerformanceReview: {
    type: Date,
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

module.exports = mongoose.model("TelecallerBusinessData", TelecallerBusinessDataSchema)
