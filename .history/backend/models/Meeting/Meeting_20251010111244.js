const mongoose = require('mongoose');

// Check if model already exists to prevent OverwriteModelError
if (mongoose.models.Meeting) {
  module.exports = mongoose.models.Meeting;
} else {
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

    // Meeting Organizer (who created the meeting)
    organizer: {
      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'organizer.employeeModel'
      },
      employeeModel: {
        type: String,
        required: true,
        enum: ['HR', 'CEO', 'TeamLeader', 'ProjectManager', 'Accountant', 'Telecaller', 'SalesEmployee']
      },
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      designation: {
        type: String,
        required: true
      }
    },

    // Participants (who attends the meeting)
    participants: [{
      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'participants.employeeModel'
      },
      employeeModel: {
        type: String,
        required: true,
        enum: ['HR', 'CEO', 'TeamLeader', 'ProjectManager', 'Accountant', 'Telecaller', 'SalesEmployee']
      },
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      designation: String,
      department: String,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'attended', 'missed'],
        default: 'pending'
      },
      responseDate: Date,
      notes: String
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
        default: 'UTC'
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

    // Departments involved
    departments: [{
      department: {
        type: String,
        enum: ['hr', 'ceo', 'team_leader', 'project_manager', 'accountant', 'telecaller', 'sales'],
        required: true
      },
    }],

    // Meeting Configuration
    meetingType: 
      type: String,
      enum: ['one_on_one', 'team', 'department', 'cross_department', 'client', 'review', 'training', 'planning', 'status_update'],
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
      enum: ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
      default: 'draft'
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'createdByModel'
    },
    createdByModel: {
      type: String,
      required: true,
      enum: ['HR', 'CEO', 'TeamLeader', 'ProjectManager', 'Accountant', 'Telecaller', 'SalesEmployee']
    }
  }, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

  // Indexes for better performance
  MeetingSchema.index({ 'organizer.employeeId': 1, createdAt: -1 });
  MeetingSchema.index({ 'participants.employeeId': 1 });
  MeetingSchema.index({ 'schedule.date': 1, 'schedule.startTime': 1 });
  MeetingSchema.index({ status: 1, 'schedule.date': 1 });
  MeetingSchema.index({ 'departments.department': 1 });

  module.exports = mongoose.model('Meeting', MeetingSchema);
}