// backend/models/HR/attendance.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    date: {
      type: String,
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
      enum: ["Present", "Absent", "Half Day", "Leave", "Holiday"]
    },
    checkIn: {
      type: String,
      default: ""
    },
    checkOut: {
      type: String,
      default: ""
    },
    totalHours: {
      type: Number,
      default: 0
    },
    overtime: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      default: ""
    },
    approvedBy: {
      type: String,
      default: ""
    },
    isApproved: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// Compound index for unique attendance per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ department: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);