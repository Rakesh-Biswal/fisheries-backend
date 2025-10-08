const mongoose = require('mongoose');

const hrTaskSchema = new mongoose.Schema({
  // Original task details from CEO
  originalTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CeoTask',
    required: true
  },
  
  // Forwarded task details
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
  
  // Assignment details
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamLeaderEmployee',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HrEmployee',
    required: true
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue'],
    default: 'pending'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Additional fields
  highlights: [{
    type: String
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'comments.userModel'
    },
    userModel: {
      type: String,
      enum: ['HREmployee', 'TeamLeader']
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
  }]
}, {
  timestamps: true
});


hrTaskSchema.index({ assignedBy: 1, status: 1 });
hrTaskSchema.index({ assignedTo: 1 });
hrTaskSchema.index({ originalTask: 1 });


module.exports = mongoose.model('HrTask', hrTaskSchema);