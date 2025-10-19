// models/ATTENDANCE/Attendance.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  // Employee reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'employeeModel'
  },
  
  employeeModel: {
    type: String,
    enum: ['TeamLeaderEmployee', 'HrEmployee', 'AccountantEmployee', 'TeleCallerEmployee']
  },

  name: {
    type: String,
  },
  
  department: {
    type: String,
    default: 'Team Leader'
  },

  date: {
    type: Date,
    default: () => new Date().setHours(0, 0, 0, 0),
  },

  // Work mode ON
  workModeOnTime: {
    type: Date,
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
    type: [{
      timestamp: { type: Date, default: Date.now },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    }],
    default: []
  },

  totalDistanceTravelled: {
    type: Number,
    default: 0,
  },

  totalWorkDuration: {
    type: Number,
    default: null,
  },

  // Status - Fixed enum
  status: {
    type: String,
    default: "Active",
  },

  workType: {
    type: String,
    default: "Field Work",
  },

  // Additional fields
  description: { type: String, trim: true, default: null },
  remarks: { type: String, trim: true, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", default: null },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  // Disable strict mode to allow any fields during development
  strict: false
});

attendanceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Remove any existing model and recompile
delete mongoose.connection.models['Attendance'];
module.exports = mongoose.model("Attendance", attendanceSchema);