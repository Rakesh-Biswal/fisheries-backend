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
    departments: {
      type: [String],
      required: true,
      enum: ["ceo", "hr", "team-leader", "project-manager", "sales-employee", "telecaller", "accountant"]
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
    departmentColors: {
      type: [String],
      default: []
    },
    backgroundColor: {
      type: String,
      default: ""
    },
    createdBy: {
      type: String,
      default: "HR Admin"
    }
  },
  {
    timestamps: true,
  }
);

// Updated index to support multiple departments
holidaySchema.index({ date: 1, departments: 1 });

module.exports = mongoose.model("Holiday", holidaySchema);