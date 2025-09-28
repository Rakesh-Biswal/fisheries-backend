// backend/models/HR/setholiday.js
const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
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
      type: String,
      default: "09:00"
    },
    endTime: {
      type: String,
      default: "17:00"
    },
    displayTime: {
      type: String,
      default: ""
    },
    departmentColor: {
      type: String,
      default: "bg-gray-100 text-gray-800"
    },
    backgroundColor: {
      type: String,
      default: "gray"
    },
    createdBy: {
      type: String,
      default: "Admin"
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringType: {
      type: String,
      enum: ["yearly", "monthly", "weekly", null],
      default: null
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
holidaySchema.index({ date: 1, department: 1 });
holidaySchema.index({ department: 1 });

module.exports = mongoose.model("Holiday", holidaySchema);