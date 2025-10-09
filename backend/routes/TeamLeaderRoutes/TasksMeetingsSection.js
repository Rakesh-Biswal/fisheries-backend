const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const HrTask = require('../../models/HR/HrTask');
const TLTask = require('../../models/TEAMLEADER/TLTask');
const SalesEmployeeEmployee = require('../../models/SALESEMPLOYEE/SalesEmployeeEmployee');
const TeamLeaderBusinessData = require('../../models/TEAMLEADER/TeamLeaderBusinessData');
const TeamSchema = require('../../models/TEAMLEADER/TeamSchema');
const TLAuth = require('./TeamLeaderAuthMiddlewear');

// Get assigned HR tasks for Team Leader
router.get('/assigned-tasks', TLAuth, async (req, res) => {
  try {
    const tasks = await HrTask.find({ 
      assignedTo: req.tl.id,
      status: { $ne: 'completed' }
    })
    .populate('assignedTo', 'name companyEmail photo')
    .populate('assignedBy', 'name companyEmail')
    .populate('originalTask')
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

// Get sales employees under this team leader (Optimized version)
router.get('/sales-employees', TLAuth, async (req, res) => {
  try {
    const teams = await TeamSchema.aggregate([
      {
        $match: {
          leader: new mongoose.Types.ObjectId(req.tl.id),
          status: 'active'
        }
      },
      {
        $lookup: {
          from: 'salesemployeeemployees',
          localField: 'workers',
          foreignField: '_id',
          as: 'workerDetails',
          pipeline: [
            {
              $match: {
                status: 'active'
              }
            },
            {
              $lookup: {
                from: 'salesemployeebusinessdatas',
                localField: '_id',
                foreignField: 'employeeId',
                as: 'businessData'
              }
            },
            {
              $project: {
                name: 1,
                companyEmail: 1,
                photo: 1,
                empCode: 1,
                qualification: 1,
                experience: 1,
                businessData: { $arrayElemAt: ['$businessData', 0] }
              }
            }
          ]
        }
      },
      {
        $project: {
          name: 1,
          workerDetails: 1
        }
      }
    ]);

    if (!teams || teams.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No active team found for this team leader'
      });
    }

    // Extract and format all unique sales employees
    const employeeMap = new Map();

    teams.forEach(team => {
      if (team.workerDetails && team.workerDetails.length > 0) {
        team.workerDetails.forEach(employee => {
          if (!employeeMap.has(employee._id.toString())) {
            const formattedEmployee = {
              _id: employee._id,
              name: employee.name,
              email: employee.companyEmail,
              photo: employee.photo,
              empCode: employee.empCode,
              designation: employee.businessData?.designation || 'Sales Executive',
              assignedZone: employee.businessData?.assignedZone || 'Not assigned',
              qualification: employee.qualification,
              experience: employee.experience,
              teamNames: [team.name]
            };
            employeeMap.set(employee._id.toString(), formattedEmployee);
          } else {
            // Add team name to existing employee
            const existingEmployee = employeeMap.get(employee._id.toString());
            if (!existingEmployee.teamNames.includes(team.name)) {
              existingEmployee.teamNames.push(team.name);
            }
          }
        });
      }
    });

    const formattedEmployees = Array.from(employeeMap.values()).map(employee => ({
      ...employee,
      teamNames: employee.teamNames.join(', ')
    }));

    res.json({
      success: true,
      data: formattedEmployees,
      totalEmployees: formattedEmployees.length,
      totalTeams: teams.length
    });
  } catch (error) {
    console.error('Error fetching sales employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales employees'
    });
  }
});

// Assign task to sales employee
router.post('/assign-task', TLAuth, async (req, res) => {
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

    // Verify original task exists and is assigned to this TL
    const originalTask = await HrTask.findOne({
      _id: originalTaskId,
      assignedTo: req.tl.id
    });

    if (!originalTask) {
      return res.status(404).json({
        success: false,
        message: 'Original task not found or not assigned to you'
      });
    }

    // Verify sales employee exists and is active
    const salesEmployee = await SalesEmployeeEmployee.findOne({
      _id: assignedTo,
      status: 'active'
    });

    if (!salesEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Sales employee not found or not active'
      });
    }

    const tlTask = new TLTask({
      originalTask: originalTaskId,
      title,
      description,
      deadline,
      priority: priority || 'medium',
      assignedTo,
      assignedBy: req.tl.id,
      highlights: highlights || [],
      assignmentDate: new Date()
    });

    await tlTask.save();
    
    // Populate assigned sales employee details
    await tlTask.populate('assignedTo', 'name companyEmail photo empCode');
    await tlTask.populate('originalTask');

    res.status(201).json({
      success: true,
      message: 'Task assigned successfully',
      data: tlTask
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign task'
    });
  }
});

// Get today's assigned tasks
router.get('/today-tasks', TLAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await TLTask.find({
      assignedBy: req.tl.id,
      assignmentDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('assignedTo', 'name companyEmail photo empCode')
    .populate('originalTask', 'title description')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching today\'s tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s tasks'
    });
  }
});

// Get assigned tasks by date
router.get('/tasks-by-date', TLAuth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const tasks = await TLTask.find({
      assignedBy: req.tl.id,
      assignmentDate: {
        $gte: selectedDate,
        $lt: nextDate
      }
    })
    .populate('assignedTo', 'name companyEmail photo empCode')
    .populate('originalTask', 'title description')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks by date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks by date'
    });
  }
});

// Get all assigned tasks (for forwarded tasks table)
router.get('/assigned-tasks-history', TLAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, date } = req.query;
    
    let query = { assignedBy: req.tl.id };
    
    // Filter by date if provided
    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      query.assignmentDate = {
        $gte: selectedDate,
        $lt: nextDate
      };
    }

    const tasks = await TLTask.find(query)
      .populate('assignedTo', 'name companyEmail photo empCode')
      .populate('originalTask', 'title description')
      .sort({ assignmentDate: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TLTask.countDocuments(query);

    res.json({
      success: true,
      data: tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching assigned tasks history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned tasks history'
    });
  }
});

// Update task response (for team leader to view responses)
router.patch('/task-response/:id', TLAuth, async (req, res) => {
  try {
    const { response } = req.body;

    const task = await TLTask.findOneAndUpdate(
      { 
        _id: req.params.id, 
        assignedBy: req.tl.id 
      },
      { 
        response: {
          ...response,
          submittedAt: new Date()
        },
        status: response.workStatus === 'success' ? 'completed' : 'in-progress'
      },
      { new: true }
    )
    .populate('assignedTo', 'name companyEmail photo empCode')
    .populate('originalTask', 'title description');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task response updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Error updating task response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task response'
    });
  }
});

// Get task statistics
router.get('/stats', TLAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await TLTask.aggregate([
      { 
        $match: { 
          assignedBy: new mongoose.Types.ObjectId(req.tl.id),
          assignmentDate: {
            $gte: today,
            $lt: tomorrow
          }
        } 
      },
      {
        $group: {
          _id: null,
          totalToday: { $sum: 1 },
          pendingToday: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedToday: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          withResponse: {
            $sum: { $cond: [{ $ne: ['$response.submittedAt', null] }, 1, 0] }
          }
        }
      }
    ]);

    const overallStats = await TLTask.aggregate([
      { 
        $match: { 
          assignedBy: new mongoose.Types.ObjectId(req.tl.id)
        } 
      },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
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

    const result = {
      today: todayStats[0] || {
        totalToday: 0,
        pendingToday: 0,
        completedToday: 0,
        withResponse: 0
      },
      overall: overallStats[0] || {
        totalAssigned: 0,
        pending: 0,
        completed: 0,
        overdue: 0
      }
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching TL task stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task statistics'
    });
  }
});

// Delete assigned task
router.delete('/assigned-tasks/:id', TLAuth, async (req, res) => {
  try {
    const task = await TLTask.findOneAndDelete({
      _id: req.params.id,
      assignedBy: req.tl.id
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

// Get single assigned task details
router.get('/assigned-tasks/:id', TLAuth, async (req, res) => {
  try {
    const task = await HrTask.findOne({
      _id: req.params.id,
      assignedTo: req.tl.id
    })
    .populate('assignedTo', 'name companyEmail photo empCode')
    .populate('assignedBy', 'name companyEmail photo')
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

// Update task status
router.patch('/assigned-tasks/:id/status', TLAuth, async (req, res) => {
  try {
    const { status, progress } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const task = await HrTask.findOneAndUpdate(
      { 
        _id: req.params.id, 
        assignedTo: req.tl.id 
      },
      { 
        status,
        progress: progress || 0,
        ...(status === 'completed' && { completedAt: new Date() })
      },
      { new: true }
    )
    .populate('assignedTo', 'name companyEmail photo empCode')
    .populate('assignedBy', 'name companyEmail photo')
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

// Get forwarded tasks for a specific HR task with date filter
router.get('/forwarded-tasks/:hrTaskId', TLAuth, async (req, res) => {
  try {
    const { hrTaskId } = req.params;
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
      originalTask: hrTaskId,
      assignedBy: req.tl.id,
      assignmentDate: { $gte: startDate }
    };

    const tasks = await TLTask.find(query)
      .populate('assignedTo', 'name companyEmail photo empCode')
      .populate('originalTask', 'title description')
      .sort({ assignmentDate: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TLTask.countDocuments(query);

    // Get statistics for the forwarded tasks
    const stats = await TLTask.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          withResponse: {
            $sum: { $cond: [{ $ne: ['$response.submittedAt', null] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: tasks,
      stats: stats[0] || { total: 0, completed: 0, withResponse: 0 },
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