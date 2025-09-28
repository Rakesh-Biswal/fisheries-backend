// backend/models/HR/Holiday.js
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
      type: String,
      required: true,
    },
    departments: {
      type: [String],
      required: true,
      validate: {
        validator: function(departments) {
          return departments && Array.isArray(departments) && departments.length > 0;
        },
        message: "At least one department must be selected"
      }
      // Remove enum temporarily for debugging
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

holidaySchema.index({ date: 1, departments: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", holidaySchema);