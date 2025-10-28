// models/SALESEMPLOYEE/FARMERLEAD.JS - Updated Schema
const mongoose = require("mongoose");

const FarmerLeadSchema = new mongoose.Schema(
  {
    // ===== Farmer Personal Information =====
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: false },
    age: { type: Number },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    farmSize: { type: String }, // e.g., "2 acres"
    farmType: { type: String }, // e.g., "Pond", "Cage", "Tank"
    farmingExperience: { type: Number }, // in years
    previousCrops: [{ type: String }], // array of previous crops/fishes grown
    preferredFishType: { type: String }, // e.g., Tilapia, Catla
    notes: { type: String }, // any additional info

    // ===== Task Tracking =====
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: false, // Optional - if submitted from a specific task
    },

    // ===== Sales Employee Tracking =====
    salesEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submissionLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    submissionDateTime: { type: Date, default: Date.now },
    salesEmployeePhotos: {
      type: [String], // URLs of selfie/proof photos
      validate: [arrayLimit, "{PATH} exceeds the limit of 4"],
    },

    // ===== Reminder/Notice Period =====
    nextFollowUpDate: { type: Date }, // to remind sales employee for next visit

    // ===== Approval Status =====
    salesEmployeeApproved: { type: Boolean, default: null }, // true/false/null
    teamLeaderApproved: { type: Boolean, default: null },
    hrApproved: { type: Boolean, default: null },

    // ===== Internal Tracking =====
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Validator to restrict array length to 4
function arrayLimit(val) {
  return val.length <= 4;
}

module.exports = mongoose.model("FarmerLead", FarmerLeadSchema);
