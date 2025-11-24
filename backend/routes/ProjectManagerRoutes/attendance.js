// routes/ProjectManagerRoutes/attendance.js
const express = require('express');
const router = express.Router();
const Attendance = require('../../models/ATTENDANCE/Attendance');
const ProjectManagerAuth = require('./ProjectManagerAuthMiddlewear');

// Get today's attendance for project manager
router.get('/today', ProjectManagerAuth, async (req, res) => {
  try {
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find attendance record for today
    const attendance = await Attendance.findOne({
      employeeId: req.pm.id,
      employeeModel: 'ProjectManagerEmployee',
      date: today
    });

    if (!attendance) {
      return res.json({
        success: true,
        data: null
      });
    }

    // Format response data
    const responseData = {
      isActive: !attendance.workModeOffTime,
      workModeOnTime: attendance.workModeOnTime,
      totalWorkDuration: attendance.totalWorkDuration,
      status: attendance.status,
      workType: attendance.workType
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error checking today attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data'
    });
  }
});

// Start work mode for project manager
router.post('/work-mode-on', ProjectManagerAuth, async (req, res) => {
  try {
    const { coordinates, workType = "Office Work" } = req.body;

    console.log('Project Manager Work mode on request:', { coordinates, workType });

    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check existing attendance
    const existingAttendance = await Attendance.findOne({
      employeeId: req.pm.id,
      employeeModel: 'ProjectManagerEmployee',
      date: today
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Work mode already started for today'
      });
    }

    // Create attendance with all possible fields
    const attendanceData = {
      employeeId: req.pm.id,
      employeeModel: 'ProjectManagerEmployee',
      department: 'Project Manager',
      date: today,
      workModeOnTime: new Date(),
      workModeOnCoordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      },
      workType,
      status: 'Active',
      name: req.pm.name || 'Project Manager' // Add name field
    };

    console.log('Creating project manager attendance with data:', attendanceData);

    const attendance = new Attendance(attendanceData);

    // Validate before saving
    const validationError = attendance.validateSync();
    if (validationError) {
      console.log('Validation errors:', validationError.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationError.errors
      });
    }

    await attendance.save();
    console.log('Project Manager Attendance saved successfully');

    // Response
    const responseData = {
      isActive: true,
      workModeOnTime: attendance.workModeOnTime,
      totalWorkDuration: null,
      status: attendance.status,
      workType: attendance.workType
    };

    res.status(201).json({
      success: true,
      message: 'Work mode started successfully',
      data: responseData
    });

  } catch (error) {
    console.error('COMPLETE ERROR starting project manager work mode:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already exists for today'
      });
    }

    // Detailed error response
    res.status(500).json({
      success: false,
      message: 'Failed to start work mode',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// End work mode for project manager
router.post('/work-mode-off', ProjectManagerAuth, async (req, res) => {
  try {
    const { coordinates } = req.body;

    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employeeId: req.pm.id,
      employeeModel: 'ProjectManagerEmployee',
      date: today
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found for today'
      });
    }

    if (attendance.workModeOffTime) {
      return res.status(400).json({
        success: false,
        message: 'Work mode already ended for today'
      });
    }

    // Set work mode off time and coordinates
    const workModeOffTime = new Date();
    attendance.workModeOffTime = workModeOffTime;
    attendance.workModeOffCoordinates = {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    };

    // Calculate total work duration in hours
    const workModeOnTime = new Date(attendance.workModeOnTime);
    const durationMs = workModeOffTime - workModeOnTime;
    const durationHours = durationMs / (1000 * 60 * 60);
    attendance.totalWorkDuration = parseFloat(durationHours.toFixed(2));

    // Determine final status based on work duration
    if (durationHours >= 8) {
      attendance.status = 'Present';
    } else if (durationHours >= 4) {
      attendance.status = 'Half Day';
    } else if (durationHours < 4) {
      attendance.status = 'Early Leave';
    } else {
      attendance.status = 'Approved';
    }

    await attendance.save();

    // Format response
    const responseData = {
      isActive: false,
      workModeOnTime: attendance.workModeOnTime,
      workModeOffTime: attendance.workModeOffTime,
      totalWorkDuration: attendance.totalWorkDuration,
      status: attendance.status,
      workType: attendance.workType
    };

    res.json({
      success: true,
      message: 'Work mode ended successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Error ending project manager work mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end work mode'
    });
  }
});

// Get attendance history for project manager
router.get('/history', ProjectManagerAuth, async (req, res) => {
  try {
    const { month, limit = 30 } = req.query;

    let query = {
      employeeId: req.pm.id,
      employeeModel: 'ProjectManagerEmployee'
    };

    // Filter by month if provided
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);

      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const attendanceHistory = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .select('date workModeOnTime workModeOffTime totalWorkDuration status workType department')
      .lean();

    res.json({
      success: true,
      data: attendanceHistory
    });

  } catch (error) {
    console.error('Error fetching project manager attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history'
    });
  }
});

module.exports = router;