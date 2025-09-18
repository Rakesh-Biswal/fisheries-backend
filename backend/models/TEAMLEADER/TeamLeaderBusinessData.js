const mongoose = require('mongoose');

const TeamLeaderBusinessDataSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamLeaderEmployee',
    required: true
  },
  empCode: {
    type: String,
    required: true
  },
  
  // Employment Details
  employeeType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'intern'],
    default: 'full-time'
  },
  department: {
    type: String,
    default: 'Sales'
  },
  designation: {
    type: String,
    default: 'Team Leader'
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  
  // Compensation
  salary: {
    type: Number,
    required: true
  },
  salaryStructureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryStructure',
    default: null
  },
  
  // Management Structure
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HrEmployee',
    default: null
  },
  teamSize: {
    type: Number,
    default: 0
  },
  assignedZone: {
    type: String,
    default: ''
  },
  
  // Performance Metrics
  probationPeriod: {
    type: Number,
    default: 6 // months
  },
  deptStatus: {
    type: String,
    enum: ['active', 'transfer', 'resigned', 'terminated'],
    default: 'active'
  },
  attendanceSummary: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Sales Targets
  monthlyTarget: {
    type: Number,
    default: 0
  },
  quarterlyTarget: {
    type: Number,
    default: 0
  },
  annualTarget: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TeamLeaderBusinessData', TeamLeaderBusinessDataSchema);