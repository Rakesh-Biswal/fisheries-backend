// models/Meeting/Meeting.js
const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  // Basic Meeting Information
  title: {
    type: String,
    required: [true, 'Meeting title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  agenda: {
    type: String,
    maxlength: [2000, 'Agenda cannot exceed 2000 characters']
  },

  // Meeting Organizer (HR who created the meeting)
  organizer: {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'HrEmployee'
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    empCode: {
      type: String,
      required: true
    },
    designation: {
      type: String,
      default: 'HR Executive'
    }
  },

  // Invited Departments with their employee references
  invitedDepartments: [{
    department: {
      type: String,
      required: true,
      enum: ['hr', 'ceo', 'team_leader', 'project_manager', 'accountant', 'telecaller', 'sales']
    },
    departmentName: {
      type: String,
      required: true
    },
    // Store all employees from this department who are invited
    invitedEmployees: [{
      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      name: String,
      email: String,
      empCode: String,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
      },
      responseDate: Date
    }]
  }],

  // Individual participants (optional - for specific people)
  participants: [{
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    employeeModel: {
      type: String,
      required: true,
      enum: ['HrEmployee', 'Ceo', 'TeamLeaderEmployee', 'ProjectManagerEmployee', 'AccountantEmployee', 'TelecallerEmployee', 'SalesEmployeeEmployee']
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    department: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'attended', 'missed'],
      default: 'pending'
    },
    responseDate: Date
  }],

  // Meeting Schedule
  schedule: {
    date: {
      type: String, // YYYY-MM-DD format
      required: true
    },
    startTime: {
      type: String, // HH:mm format
      required: true
    },
    endTime: {
      type: String, // HH:mm format
      required: true
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },

  // Meeting Platform & Location
  platform: {
    type: String,
    enum: ['google_meet', 'zoom', 'microsoft_teams', 'slack', 'in_person', 'other'],
    default: 'google_meet'
  },
  meetingLink: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional if in_person
        return /^https?:\/\//.test(v);
      },
      message: 'Meeting link must be a valid URL'
    }
  },
  location: {
    type: String,
    maxlength: [500, 'Location cannot exceed 500 characters']
  },

  // Meeting Configuration
  meetingType: {
    type: String,
    enum: ['one_on_one', 'team', 'department', 'cross_department', 'client', 'review', 'training', 'planning', 'status_update'],
    default: 'cross_department'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Status & Tracking
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },

  // Notifications
  notifications: {
    sentToDepartments: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
MeetingSchema.index({ 'organizer.employeeId': 1, createdAt: -1 });
MeetingSchema.index({ 'invitedDepartments.department': 1 });
MeetingSchema.index({ 'participants.employeeId': 1 });
MeetingSchema.index({ 'schedule.date': 1, 'schedule.startTime': 1 });
MeetingSchema.index({ status: 1, 'schedule.date': 1 });

// Virtual for checking if meeting is upcoming
MeetingSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const meetingDate = new Date(`${this.schedule.date}T${this.schedule.startTime}`);
  return meetingDate > now && this.status === 'scheduled';
});

// Virtual for checking if meeting is live
MeetingSchema.virtual('isLive').get(function() {
  const now = new Date();
  const startTime = new Date(`${this.schedule.date}T${this.schedule.startTime}`);
  const endTime = new Date(`${this.schedule.date}T${this.schedule.endTime}`);
  return now >= startTime && now <= endTime && this.status === 'scheduled';
});

module.exports = mongoose.model('Meeting', MeetingSchema);