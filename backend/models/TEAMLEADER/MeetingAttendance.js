const mongoose = require('mongoose');

const MeetingAttendanceSchema = new mongoose.Schema({
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true
  },
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  participantName: String,
  joinTime: String,
  leaveTime: String,
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'excused'],
    default: 'absent'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MeetingAttendance', MeetingAttendanceSchema);