const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CeoTask = require('../../models/CEO/CeoTask');
const HrTask = require('../../models/HR/HrTask');
const TeamLeader = require('../../models/TEAMLEADER/TeamLeaderEmployee');
const authenticateToken = require('./HrAuthMiddlewear');

// Get assigned CEO tasks for HR
router.get('/assigned-tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await CeoTask.find({
      assignedTo: req.user._id,
      status: { $ne: 'completed' }
    })
      .populate([
        { path: 'assignedTo', select: 'name email photo' },
        { path: 'createdBy', select: 'name email' }
      ])
      .select('title description deadline status priority progress createdAt') // Only needed fields
      .lean() // Returns plain JS objects, faster
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching assigned tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned tasks'
    });
  }
});

// Get available team leaders for task assignment
router.get('/team-leaders', authenticateToken, async (req, res) => {
  try {
    const teamLeaders = await TeamLeader.find({
      status: 'active'
    }).select('name email photo designation');

    res.json({
      success: true,
      data: teamLeaders
    });
  } catch (error) {
    console.error('Error fetching team leaders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team leaders'
    });
  }
});

// Forward task to team leader
router.post('/forward-task', authenticateToken, async (req, res) => {
  try {
    const {
      originalTaskId,
      title,
      description,
      deadline,
      priority,
      assignedTo,
      highlights
    } = req.body;

    // Validate required fields
    if (!originalTaskId || !title || !description || !deadline || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Verify original task exists and is assigned to this HR
    const originalTask = await CeoTask.findOne({
      _id: originalTaskId,
      assignedTo: req.user._id
    });

    if (!originalTask) {
      return res.status(404).json({
        success: false,
        message: 'Original task not found or not assigned to you'
      });
    }

    const hrTask = new HrTask({
      originalTask: originalTaskId,
      title,
      description,
      deadline,
      priority: priority || 'medium',
      assignedTo,
      assignedBy: req.user._id,
      highlights: highlights || []
    });

    await hrTask.save();

    // Populate assigned team leader details
    await hrTask.populate('assignedTo', 'name email photo');
    await hrTask.populate('originalTask');

    res.status(201).json({
      success: true,
      message: 'Task forwarded successfully',
      data: hrTask
    });
  } catch (error) {
    console.error('Error forwarding task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to forward task'
    });
  }
});

// Get forwarded tasks (tasks assigned by this HR to team leaders)
router.get('/forwarded-tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await HrTask.find({ assignedBy: req.user._id })
      .populate('assignedTo', 'name email photo')
      .populate('originalTask', 'title description')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching forwarded tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forwarded tasks'
    });
  }
});

// Update forwarded task
router.put('/forwarded-tasks/:id', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      deadline,
      priority,
      assignedTo,
      status,
      progress,
      highlights
    } = req.body;

    const task = await HrTask.findOneAndUpdate(
      { _id: req.params.id, assignedBy: req.user._id },
      {
        title,
        description,
        deadline,
        priority,
        assignedTo,
        status,
        progress,
        highlights: highlights || []
      },
      { new: true }
    )
      .populate('assignedTo', 'name email photo')
      .populate('originalTask', 'title description');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
});

// Delete forwarded task
router.delete('/forwarded-tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await HrTask.findOneAndDelete({
      _id: req.params.id,
      assignedBy: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [assignedStats, forwardedStats] = await Promise.all([
      // Assigned tasks stats
      CeoTask.aggregate([
        { 
          $match: { 
            assignedTo: new mongoose.Types.ObjectId(req.user._id) 
          } 
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // Forwarded tasks stats  
      HrTask.aggregate([
        { 
          $match: { 
            assignedBy: new mongoose.Types.ObjectId(req.user._id) 
          } 
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Process results more efficiently
    const result = {
      assigned: processStats(assignedStats),
      forwarded: processStats(forwardedStats)
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching HR task stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task statistics'
    });
  }
});

function processStats(statsArray) {
  const result = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  };
  
  statsArray.forEach(stat => {
    result.total += stat.count;
    result[stat._id] = stat.count;
  });
  
  return result;
}

// Get single assigned task details for HR
router.get('/assigned-tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await CeoTask.findOne({
      _id: req.params.id,
      assignedTo: req.user.id
    })
      .populate('assignedTo', 'name companyEmail photo empCode')
      .populate('createdBy', 'name companyEmail photo')
      .populate('originalTask');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not assigned to you'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task details'
    });
  }
});

// Update task status for HR
router.patch('/assigned-tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, progress } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const task = await CeoTask.findOneAndUpdate(
      {
        _id: req.params.id,
        assignedTo: req.user.id
      },
      {
        status,
        progress: progress || 0,
        ...(status === 'completed' && { completedAt: new Date() })
      },
      { new: true }
    )
      .populate('assignedTo', 'name companyEmail photo empCode')
      .populate('createdBy', 'name companyEmail photo')
      .populate('originalTask');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not assigned to you'
      });
    }

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status'
    });
  }
});

// Get forwarded tasks for a specific CEO task with date filter (HR version)
router.get('/forwarded-tasks/:ceoTaskId', authenticateToken, async (req, res) => {
  try {
    const { ceoTaskId } = req.params;
    const { period = '3days', page = 1, limit = 10 } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '15days':
        startDate.setDate(now.getDate() - 15);
        break;
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default: // 3 days
        startDate.setDate(now.getDate() - 3);
    }

    startDate.setHours(0, 0, 0, 0);

    const query = {
      originalTask: ceoTaskId,
      assignedBy: req.user.id,
      assignmentDate: { $gte: startDate }
    };

    const tasks = await HrTask.find(query)
      .populate('assignedTo', 'name companyEmail photo empCode designation')
      .populate('originalTask', 'title description')
      .sort({ assignmentDate: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await HrTask.countDocuments(query);

    // Get statistics for the forwarded tasks
    const stats = await HrTask.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: tasks,
      stats: stats[0] || { total: 0, completed: 0, inProgress: 0 },
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching forwarded tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forwarded tasks'
    });
  }
});

module.exports = router;