// backend/models/HR/Holiday.js - UPDATED TO MATCH YOUR ENUM
const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
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
  departments: [{
    type: String,
    enum: ['hr', 'team-leader', 'project-manager', 'sales-employee', 'telecaller', 'accountant', 'ceo'],
    required: true
  }],
  status: {
    type: String,
    enum: ["Full Day Holiday", "Half Day Holiday", "Working Day"],
    required: true
  },
  startTime: {
    type: String, // Format: HH:mm
    default: "09:00"
  },
  endTime: {
    type: String, // Format: HH:mm
    default: "17:00"
  },
  displayTime: {
    type: String,
    default: ""
  },
  departmentColors: [{
    type: String
  }],
  backgroundColor: {
    type: String,
    default: ""
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HrEmployee',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate holidays for same date and departments
holidaySchema.index({ date: 1, departments: 1 }, { unique: true });

// Index for efficient querying
holidaySchema.index({ date: 1 });
holidaySchema.index({ departments: 1 });
holidaySchema.index({ status: 1 });

module.exports = mongoose.model("Holiday", holidaySchema);