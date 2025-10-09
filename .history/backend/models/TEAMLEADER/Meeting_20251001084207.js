const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  // Basic Meeting Info
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  googleMeetLink: {
    type: String,
    required: true
  },
  
  // Organizer (Team Leader)
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamLeaderEmployee',
    required: true
  },
  
  // Participants - simplified without refPath
  participants: [{
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: String,
    email: String,
    employeeType: {
      type: String,
      enum: ['sales', 'project_manager'],
      default: 'sales'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'attended', 'missed'],
      default: 'pending'
    }
  }],
  
  // Time Slots
  timeSlots: [{
    date: {
      type: String, // Store as string for easier handling
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
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    }
  }],
  
  // Meeting Details
  agenda: {
    type: String,
    default: ''
  },
  meetingType: {
    type: String,
    enum: ['one-on-one', 'team', 'client', 'review', 'training'],
    default: 'team'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Status & Tracking
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'draft'
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

// Update the updatedAt field before saving
MeetingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Meeting', MeetingSchema);