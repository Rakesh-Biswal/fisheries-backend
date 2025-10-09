const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CeoTask = require('../../models/CEO/CeoTask');
const HREmployee = require('../../models/HR/HrEmployee');
const ceoAuth = require('./CeoAuthMiddlewear');

// Get all tasks with HR employee details
router.get('/tasks', ceoAuth, async (req, res) => {
  try {
    const tasks = await CeoTask.find({ createdBy: req.ceo.id })
      .populate('assignedTo', 'name email photo')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

// Get available HR employees for task assignment
router.get('/hr-employees', ceoAuth, async (req, res) => {
  try {
    const hrEmployees = await HREmployee.find({
      status: 'active'
    }).select('name email photo designation');

    res.json({
      success: true,
      data: hrEmployees
    });
  } catch (error) {
    console.error('Error fetching HR employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch HR employees'
    });
  }
});

// Create new task
router.post('/tasks', ceoAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      deadline,
      highlights,
      images,
      assignedTo,
      priority
    } = req.body;

    // Validate required fields
    if (!title || !description || !deadline || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, deadline, and assigned HR are required'
      });
    }

    const task = new CeoTask({
      title,
      description,
      deadline,
      highlights: highlights || [],
      images: images || [],
      assignedTo,
      priority: priority || 'medium',
      createdBy: req.ceo.id
    });

    await task.save();

    // Populate assigned HR details
    await task.populate('assignedTo', 'name email photo');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
});

// Update task status
router.patch('/tasks/:id/status', ceoAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await CeoTask.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.ceo.id },
      { status },
      { new: true }
    ).populate('assignedTo', 'name email photo');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
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


// Update task
router.put('/tasks/:id', ceoAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      deadline,
      highlights,
      images,
      assignedTo,
      priority,
      status,
      progress
    } = req.body;

    const task = await CeoTask.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.ceo.id },
      {
        title,
        description,
        deadline,
        highlights: highlights || [],
        images: images || [],
        assignedTo,
        priority,
        status,
        progress
      },
      { new: true }
    ).populate('assignedTo', 'name email photo');

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

// Delete task
router.delete('/tasks/:id', ceoAuth, async (req, res) => {
  try {
    const task = await CeoTask.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.ceo.id
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

// Get task statistics
router.get('/tasks/stats', ceoAuth, async (req, res) => {
  try {
    // Use aggregation without ObjectId conversion for simple counting
    const stats = await CeoTask.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(req.ceo.id)
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'completed'] },
                    { $lt: ['$deadline', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // If no tasks exist, return default values
    const result = stats[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task statistics'
    });
  }
});

module.exports = router;