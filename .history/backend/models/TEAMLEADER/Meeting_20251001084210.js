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
  
  // Participants
  participants: [{
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.employeeModel'
    },
    employeeModel: {
      type: String,
      enum: ['SalesEmployee', 'ProjectManager', 'HR', 'Accountant', 'Telecaller'],
      required: true
    },
    name: String,
    email: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'attended', 'missed'],
      default: 'pending'
    }
  }],
  
  // Time Slots (Multiple slots for flexibility)
  timeSlots: [{
    date: {
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
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    },
    actualStartTime: String,
    actualEndTime: String
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
  
  // Files & Documents
  documents: [{
    filename: String,
    originalName: String,
    fileType: String,
    fileSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamLeaderEmployee'
    }
  }],
  
  // Screenshots & Reports
  screenshots: [{
    filename: String,
    originalName: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    caption: String
  }],
  
  dailyReports: [{
    filename: String,
    originalName: String,
    fileType: String,
    fileSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    reportDate: Date,
    summary: String
  }],
  
  // Status & Tracking
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Notifications
  notifications: {
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderTime: Date,
    participantsNotified: {
      type: Boolean,
      default: false
    }
  },
  
  // Feedback & Follow-up
  feedback: [{
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.employeeId'
    },
    rating: Number,
    comments: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  followUpActions: [{
    action: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.employeeId'
    },
    deadline: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    }
  }],
  
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

// Index for better query performance
MeetingSchema.index({ organizer: 1, createdAt: -1 });
MeetingSchema.index({ 'participants.employeeId': 1 });
MeetingSchema.index({ 'timeSlots.date': 1 });

module.exports = mongoose.model('Meeting', MeetingSchema);const mongoose = require('mongoose');

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