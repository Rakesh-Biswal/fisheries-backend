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
    role: { type: String, default: "farmer" },

    // ===== Task Tracking =====
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TLTask",
      required: false, // CHANGED: Made optional
    },

    // ===== Sales Employee Tracking =====
    salesEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesEmployeeEmployee",
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
    nextFollowUpDate: {
      type: Date,
      index: true,
    }, // to remind sales employee for next visit
    followUpStatus: {
      type: String,
      enum: ["pending", "completed", "overdue", "cancelled"],
      default: "pending",
    },
    followUpNotes: { type: String },
    lastFollowUpDate: { type: Date },

    // ===== Lead Status Tracking =====
    leadStatus: {
      type: String,
      enum: ["new", "processing", "completed", "cancelled"],
      default: "new",
    },
    completionStage: {
      type: String,
      enum: ["basic", "intermediate", "advanced"],
      default: "basic",
    },
    // ===== Notification Tracking =====
    notificationsSent: {
      twoDayReminder: { type: Boolean, default: false },
      oneDayReminder: { type: Boolean, default: false },
      sameDayReminder: { type: Boolean, default: false },
    },
    // ===== Approval Status =====
    salesEmployeeApproved: { type: Boolean, default: null }, // true/false/null
    teamLeaderApproved: { type: Boolean, default: true },
    hrApproved: { type: Boolean, default: true },

    // ===== Password for Farmer Login =====
    temporaryPassword: { type: String }, // Auto-generated temporary password

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

FarmerLeadSchema.index({
  salesEmployeeId: 1,
  nextFollowUpDate: 1,
  followUpStatus: 1,
});

FarmerLeadSchema.index({
  salesEmployeeId: 1,
  leadStatus: 1,
});

module.exports = mongoose.model("FarmerLead", FarmerLeadSchema);
