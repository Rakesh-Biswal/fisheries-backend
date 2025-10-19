const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  // Meeting details
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  meetingDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  
  // Organizer details
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'organizerModel',
    required: true
  },
  organizerModel: {
    type: String,
    enum: ['CEO', 'HREmployee', 'TeamLeaderEmployee', 'SalesEmployeeEmployee'],
    required: true
  },
  organizerRole: {
    type: String,
    required: true
  },
  
  // Participants
  participants: [{
    department: {
      type: String,
      enum: ['ceo', 'hr', 'team-leader', 'project-manager', 'sales-employee', 'telecaller', 'accountant'],
      required: true
    },
    role: {
      type: String,
      required: true
    }
  }],
  
  // Meeting status
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  
  // Additional details
  platform: {
    type: String,
    default: 'Google Meet'
  },
  meetingLink: {
    type: String,
    default: ''
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

// Index for better query performance
meetingSchema.index({ meetingDate: 1 });
meetingSchema.index({ organizer: 1 });
meetingSchema.index({ 'participants.department': 1 });

// Virtual for formatted date
meetingSchema.virtual('formattedDate').get(function() {
  return this.meetingDate.toISOString().split('T')[0];
});

// Virtual for time range
meetingSchema.virtual('timeRange').get(function() {
  return `${this.startTime} — ${this.endTime}`;
});

module.exports = mongoose.model('Meeting', meetingSchema);