const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: String, // Stored as YYYY-MM-DD format
      required: true,
    },
    department: {
      type: String,
      required: true,
      enum: ["HR", "Development", "Design", "Marketing", "Sales", "Support", "Management"]
    },
    status: {
      type: String,
      required: true,
      enum: ["Full Day Holiday", "Half Day Holiday", "Working Day"]
    },
    startTime: {
      type: String, // HH:mm format
      default: "09:00"
    },
    endTime: {
      type: String, // HH:mm format
      default: "17:00"
    },
    displayTime: {
      type: String,
      default: ""
    },
    departmentColor: {
      type: String,
      default: ""
    },
    backgroundColor: {
      type: String,
      default: ""
    },
    createdBy: {
      type: String,
      default: "Admin"
    }
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate events on the same date for same department
holidaySchema.index({ date: 1, department: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", holidaySchema);