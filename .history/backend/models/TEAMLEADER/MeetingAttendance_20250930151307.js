const mongoose = require('mongoose');

const MeetingAttendanceSchema = new mongoose.Schema({
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true
  },
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'participantModel'
  },
  participantModel: {
    type: String,
    enum: ['SalesEmployeeEmployee', 'ProjectManagerEmployee'],
    required: true
  },
  timeSlot: {
    date: Date,
    startTime: String,
    endTime: String
  },
  joinTime: String,
  leaveTime: String,
  duration: Number, // in minutes
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'excused'],
    default: 'absent'
  },
  notes: String,
  
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

MeetingAttendanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MeetingAttendance', MeetingAttendanceSchema);