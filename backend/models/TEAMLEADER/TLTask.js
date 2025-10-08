const mongoose = require('mongoose');

const tlTaskSchema = new mongoose.Schema({
  // Original task details from HR
  originalTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HrTask',
    required: true
  },
  
  // Task details
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  highlights: [{
    type: String
  }],
  
  // Assignment details
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesEmployeeEmployee',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamLeaderEmployee',
    required: true
  },
  assignmentDate: {
    type: Date,
    default: Date.now
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue', 'cancelled'],
    default: 'pending'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Sales Employee Response (to be filled at end of day)
  response: {
    submittedAt: Date,
    responseTitle: String,
    responseDescription: String,
    workStatus: {
      type: String,
      enum: ['success', 'rejected', 'under-process', 'not-responded', 'partial-success', 'delayed'],
      default: 'not-responded'
    },
    keyPoints: [String],
    images: [{
      url: String,
      publicId: String,
      caption: String
    }],
    challengesFaced: String,
    nextSteps: String,
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    hoursSpent: Number,
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // Additional fields
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'comments.userModel'
    },
    userModel: {
      type: String,
      enum: ['TeamLeaderEmployee', 'SalesEmployeeEmployee']
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  
  // Tracking fields
  reminderSent: {
    type: Boolean,
    default: false
  },
  autoCompleteAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
tlTaskSchema.index({ assignedBy: 1, assignmentDate: 1 });
tlTaskSchema.index({ assignedTo: 1, status: 1 });
tlTaskSchema.index({ assignmentDate: 1 });
tlTaskSchema.index({ 'response.submittedAt': 1 });

// Virtual for checking if response is submitted
tlTaskSchema.virtual('hasResponse').get(function() {
  return !!this.response.submittedAt;
});

// Method to check if task is due today
tlTaskSchema.methods.isDueToday = function() {
  const today = new Date();
  const taskDate = new Date(this.assignmentDate);
  return today.toDateString() === taskDate.toDateString();
};

module.exports = mongoose.model('TLTask', tlTaskSchema);