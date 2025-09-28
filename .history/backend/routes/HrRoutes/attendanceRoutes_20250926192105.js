// backend/models/HR/Holiday.js
const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      unique: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    department: {
      type: String,
      required: true,
      enum: ["HR", "Development", "Design", "Marketing", "Sales", "Support", "Management", "All"]
    },
    status: {
      type: String,
      required: true,
      enum: ["Full Day Holiday", "Half Day Holiday", "Working Day"]
    },
    startTime: {
      type: String, // Format: HH:mm
      default: "00:00"
    },
    endTime: {
      type: String, // Format: HH:mm
      default: "23:59"
    },
    type: {
      type: String,
      enum: ["public", "company", "department"],
      default: "company"
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying
holidaySchema.index({ date: 1, department: 1 });
holidaySchema.index({ department: 1, status: 1 });

module.exports = mongoose.model("Holiday", holidaySchema);