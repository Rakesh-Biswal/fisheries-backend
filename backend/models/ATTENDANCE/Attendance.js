const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    // Employee reference
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "employeeModel",
    },

    employeeModel: {
      type: String,
      required: true,
      enum: [
        "TeamLeaderEmployee",
        "HrEmployee",
        "AccountantEmployee",
        "TeleCallerEmployee",
        "SalesEmployeeEmployee",
      ],
    },

    // Personal info fields
    name: {
      type: String,
      required: false,
    },

    department: {
      type: String,
      required: false,
      enum: [
        "Team Leader",
        "HR",
        "Accountant",
        "Tele Caller",
        "Field Executive",
      ],
      default: "Field Executive", // Changed default for sales employees
    },

    // Date and time
    date: {
      type: Date,
      required: true,
      default: () => new Date().setHours(0, 0, 0, 0),
    },

    // Work mode ON
    workModeOnTime: {
      type: Date,
      required: true,
    },
    workModeOnCoordinates: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },

    // Work mode OFF
    workModeOffTime: {
      type: Date,
      default: null,
    },
    workModeOffCoordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },

    // Tracking data
    travelLogs: {
      type: [
        {
          timestamp: { type: Date, default: Date.now },
          coordinates: {
            latitude: { type: Number },
            longitude: { type: Number },
          },
          distanceFromStart: { type: Number, default: 0 }, // Distance from starting point
        },
      ],
      default: [],
    },

    totalDistanceTravelled: {
      type: Number,
      default: 0,
    },

    totalWorkDuration: {
      type: Number,
      default: null,
    },

    // Status
    status: {
      type: String,
      enum: [
        "Active",
        "AwaitingApproval",
        "Approved",
        "Rejected",
        "Present",
        "Half Day",
        "Leave",
        "Absent",
        "Late Arrival",
        "Early Leave",
      ],
      default: "Active",
    },

    workType: {
      type: String,
      default: "Field Work",
    },

    // Additional fields
    description: { type: String, trim: true, default: null },
    remarks: { type: String, trim: true, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HrEmployee",
      default: null,
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    strict: false,
  }
);

// Index for faster queries
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ employeeId: 1, workModeOnTime: -1 });

attendanceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);