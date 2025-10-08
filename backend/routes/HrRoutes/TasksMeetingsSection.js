const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CeoTask = require('../../models/CEO/CeoTask');
const HrTask = require('../../models/HR/HrTask');
const TeamLeader = require('../../models/TEAMLEADER/TeamLeaderEmployee');
const { authenticateToken } = require('./HrAuthMiddlewear');

// Get assigned CEO tasks for HR
router.get('/assigned-tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await CeoTask.find({ 
      assignedTo: req.user._id,
      status: { $ne: 'completed' }
    })
    .populate('assignedTo', 'name email photo')
    .populate('createdBy', 'name email')
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

// Get task statistics for HR dashboard
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const assignedStats = await CeoTask.aggregate([
      { 
        $match: { 
          assignedTo: new mongoose.Types.ObjectId(req.user._id) 
        } 
      },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          pendingAssigned: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inProgressAssigned: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          }
        }
      }
    ]);

    const forwardedStats = await HrTask.aggregate([
      { 
        $match: { 
          assignedBy: new mongoose.Types.ObjectId(req.user._id) 
        } 
      },
      {
        $group: {
          _id: null,
          totalForwarded: { $sum: 1 },
          pendingForwarded: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedForwarded: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = {
      assigned: assignedStats[0] || {
        totalAssigned: 0,
        pendingAssigned: 0,
        inProgressAssigned: 0
      },
      forwarded: forwardedStats[0] || {
        totalForwarded: 0,
        pendingForwarded: 0,
        completedForwarded: 0
      }
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching HR task stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task statistics'
    });
  }
});

module.exports = router;