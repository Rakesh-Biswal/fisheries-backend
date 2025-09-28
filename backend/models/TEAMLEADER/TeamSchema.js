const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema({
  // Basic Team Info
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },

  // Created By (HR Reference)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HrEmployee",
    required: true,
  },

  // Team Leader Reference
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TeamLeaderEmployee",
    required: true,
  },

  // Workers References
  workers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesEmployeeEmployee",
    },
  ],

  // Future-Ready Fields
  project: {
    type: String,
    default: null, // assign project later
  },
  region: {
    type: String,
    default: null, // e.g. North, South, West, East
  },
  performanceScore: {
    type: Number,
    default: null, // HR/manager can assign later
  },
  notes: {
    type: String,
    default: null, // remarks or additional info
  },

  // System Fields
  status: {
    type: String,
    enum: ["active", "inactive", "archived"],
    default: "active",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Team", TeamSchema);