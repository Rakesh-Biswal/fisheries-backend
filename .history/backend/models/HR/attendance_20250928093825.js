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
    department: {
      type: String,
      required: true,
      enum: ["Accountant", "HR", "ProjectManager", "TeamLeader", "SalesEmployee", "Telecaller"]
    },
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
    totalHours: {
      type: Number, // in hours
      default: 0
    },
    notes: {
      type: String,
      default: ""
    },
    isHoliday: {
      type: Boolean,
      default: false
    },
    holidayType: {
      type: String,
      enum: ["Full Day Holiday", "Half Day Holiday", null],
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique attendance per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, department: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);