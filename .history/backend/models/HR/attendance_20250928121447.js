// backend/models/HR/Attendance.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true
    },
    // Now supports multiple departments
    departments: [
      {
        type: String,
        enum: ["Accountant", "Project Manager", "Team Leader", "Telecaller", "Sales Employee"]
      }
    ],
    status: {
      type: String,
      required: true,
      enum: ["Present", "Absent", "Half Day", "Leave", "Holiday"]
    },
    checkIn: {
      type: String, // Format: HH:mm
      default: null
    },
    checkOut: {
      type: String, // Format: HH:mm
      default: null
    },
    description: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
