// models/AttendanceCalendar.js
const mongoose = require('mongoose');

const attendanceCalendarSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  date: {
    type: String,
    required: [true, 'Event date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  departments: [{
    type: String,
    required: [true, 'At least one department is required'],
    enum: [
      'HR', 'Development', 'Design', 'Marketing', 'Sales', 
      'Support', 'Management', 'Accountant', 'Project Manager', 
      'Team Leader', 'Telecaller', 'Sales Employee'
    ]
  }],
  status: {
    type: String,
    required: [true, 'Event status is required'],
    enum: ['Full Day Holiday', 'Half Day Holiday', 'Working Day']
  },
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  displayTime: {
    type: String,
    required: true
  },
  departmentColors: [{
    type: String
  }],
  backgroundColor: {
    type: String
  }
}, {
  timestamps: true
});

// Index for better query performance
attendanceCalendarSchema.index({ date: 1 });
attendanceCalendarSchema.index({ departments: 1 });
attendanceCalendarSchema.index({ status: 1 });

// Virtual for formatted date
attendanceCalendarSchema.virtual('formattedDate').get(function() {
  return new Date(this.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

module.exports = mongoose.model('AttendanceCalendar', attendanceCalendarSchema);