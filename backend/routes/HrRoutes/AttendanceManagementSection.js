// routes/HrRoutes/AttendanceManagementSection.js
const express = require('express');
const router = express.Router();
const Attendance = require('../../models/ATTENDANCE/Attendance');
const HRAuth = require('./HrAuthMiddlewear');

// Import all employee models
const TeamLeaderEmployee = require('../../models/TEAMLEADER/TeamLeaderEmployee');
const HrEmployee = require('../../models/HR/HrEmployee');
const AccountantEmployee = require('../../models/ACCOUNTANT/AccountantEmployee');
const TeleCallerEmployee = require('../../models/TELECALLER/TelecallerEmployee');
const ProjectManagerEmployee = require('../../models/PROJECTMANAGER/ProjectManagerEmployee');
const SalesEmployeeEmployee = require('../../models/SALESEMPLOYEE/SalesEmployeeEmployee');
const mongoose = require('mongoose');




// Get pending attendance requests (work mode off but not approved)
router.get('/pending-requests', HRAuth, async (req, res) => {
  try {
    const { date, department, status } = req.query;
    
    let query = {
      workModeOffTime: { $exists: true, $ne: null },
      status: { $in: ['Active', 'AwaitingApproval', 'Present', 'Half Day', 'Early Leave'] }
    };

    // Filter by date if provided
    if (date) {
      const filterDate = new Date(date);
      filterDate.setHours(0, 0, 0, 0);
      query.date = filterDate;
    }

    // Filter by department if provided
    if (department && department !== 'all') {
      query.department = department;
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    const pendingRequests = await Attendance.find(query)
      .populate('employeeId', 'name email phone')
      .sort({ date: -1, workModeOffTime: -1 })
      .lean();

    // Format response
    const formattedRequests = pendingRequests.map(attendance => ({
      _id: attendance._id,
      employeeId: attendance.employeeId._id,
      employeeName: attendance.employeeId?.name || 'Unknown',
      employeeEmail: attendance.employeeId?.email || 'No email',
      employeePhone: attendance.employeeId?.phone || 'No phone',
      department: attendance.department,
      date: attendance.date,
      workModeOnTime: attendance.workModeOnTime,
      workModeOffTime: attendance.workModeOffTime,
      totalWorkDuration: attendance.totalWorkDuration,
      currentStatus: attendance.status,
      workType: attendance.workType,
      description: attendance.description,
      workModeOnLocation: attendance.workModeOnCoordinates,
      workModeOffLocation: attendance.workModeOffCoordinates
    }));

    res.json({
      success: true,
      data: formattedRequests
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending attendance requests'
    });
  }
});

// Get attendance history with filters
router.get('/attendance-history', HRAuth, async (req, res) => {
  try {
    const { startDate, endDate, department, status, employeeId } = req.query;
    
    let query = {};

    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    // Department filter
    if (department && department !== 'all') {
      query.department = department;
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Employee filter
    if (employeeId) {
      query.employeeId = employeeId;
    }

    const attendanceHistory = await Attendance.find(query)
      .populate('employeeId', 'name email phone department')
      .sort({ date: -1, workModeOnTime: -1 })
      .limit(100) // Limit to recent 100 records
      .lean();

    res.json({
      success: true,
      data: attendanceHistory
    });

  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history'
    });
  }
});

// Update attendance status
router.put('/update-status/:attendanceId', HRAuth, async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, description, remarks } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updateData = {
      status,
      updatedAt: new Date(),
      approvedBy: req.hr.id
    };

    // Add description if provided (especially for rejected/absent cases)
    if (description) {
      updateData.description = description;
    }

    // Add remarks if provided
    if (remarks) {
      updateData.remarks = remarks;
    }

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      updateData,
      { new: true }
    ).populate('employeeId', 'name email phone');

    if (!updatedAttendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance status updated successfully',
      data: updatedAttendance
    });

  } catch (error) {
    console.error('Error updating attendance status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance status'
    });
  }
});

// Get all employees list for HR
router.get('/employees', HRAuth, async (req, res) => {
  try {
    // Fetch employees from all departments
    const [teamLeaders, hrEmployees, accountants, teleCallers, projectManagers, salesEmployees] = await Promise.all([
      TeamLeaderEmployee.find({ status: 'active' }).select('name companyEmail empCode photo role createdAt').lean(),
      HrEmployee.find({ status: 'active' }).select('name companyEmail empCode photo role createdAt').lean(),
      AccountantEmployee.find({ status: 'active' }).select('name companyEmail empCode photo role createdAt').lean(),
      TeleCallerEmployee.find({ status: 'active' }).select('name companyEmail empCode photo role createdAt').lean(),
      ProjectManagerEmployee.find({ status: 'active' }).select('name companyEmail empCode photo role createdAt').lean(),
      SalesEmployeeEmployee.find({ status: 'active' }).select('name companyEmail empCode photo role createdAt').lean()
    ]);

    // Combine all employees and format
    const allEmployees = [
      ...teamLeaders.map(emp => ({ ...emp, employeeModel: 'TeamLeaderEmployee', department: 'Team Leader' })),
      ...hrEmployees.map(emp => ({ ...emp, employeeModel: 'HrEmployee', department: 'HR' })),
      ...accountants.map(emp => ({ ...emp, employeeModel: 'AccountantEmployee', department: 'Accountant' })),
      ...teleCallers.map(emp => ({ ...emp, employeeModel: 'TeleCallerEmployee', department: 'Tele Caller' })),
      ...projectManagers.map(emp => ({ ...emp, employeeModel: 'ProjectManagerEmployee', department: 'Project Manager' })),
      ...salesEmployees.map(emp => ({ ...emp, employeeModel: 'SalesEmployeeEmployee', department: 'Sales Employee' }))
    ];

    res.json({
      success: true,
      data: allEmployees
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees list'
    });
  }
});













// Get employee details by ID
router.get("/employee/:employeeId", HRAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID format",
      });
    }

    // All employee models
    const employeeModels = [
      { model: TeamLeaderEmployee, name: "Team Leader" },
      { model: HrEmployee, name: "HR" },
      { model: AccountantEmployee, name: "Accountant" },
      { model: TeleCallerEmployee, name: "Tele Caller" },
      { model: ProjectManagerEmployee, name: "Project Manager" },
      { model: SalesEmployeeEmployee, name: "Sales Employee" },
    ];

    let employee = null;
    let department = "Unknown";

    // Check across collections
    for (const empModel of employeeModels) {
      const found = await empModel.model
        .findById(employeeId)
        .select("-password")
        .lean();
      if (found) {
        employee = found;
        department = empModel.name;
        break;
      }
    }

    // If not found in any collection
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in any department",
      });
    }

    // Add department info for frontend
    employee.department = department;

    return res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee details",
      error: error.message,
    });
  }
});

// Get employee attendance history with calendar data
router.get('/employee/:employeeId/attendance', HRAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query; // Format: month=1-12, year=2024

    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    }

    const attendanceHistory = await Attendance.find({
      employeeId,
      ...dateFilter
    })
    .sort({ date: -1 })
    .lean();

    // Format for calendar view
    const calendarData = attendanceHistory.map(record => ({
      date: record.date,
      status: record.status,
      workDuration: record.totalWorkDuration,
      workType: record.workType,
      description: record.description,
      workModeOnTime: record.workModeOnTime,
      workModeOffTime: record.workModeOffTime,
      _id: record._id
    }));

    res.json({
      success: true,
      data: {
        attendanceHistory,
        calendarData
      }
    });

  } catch (error) {
    console.error('Error fetching employee attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee attendance'
    });
  }
});

// Create or update attendance for any date
router.post('/employee/:employeeId/attendance', HRAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date, status, description, workType } = req.body;

    console.log('Received attendance request:', { employeeId, date, status, description, workType });

    if (!date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Date and status are required'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID format",
      });
    }

    // Get employee details to populate name and department
    const employeeModels = [
      TeamLeaderEmployee,
      HrEmployee,
      AccountantEmployee,
      TeleCallerEmployee,
      ProjectManagerEmployee,
      SalesEmployeeEmployee
    ];

    let employee = null;
    let department = "Unknown";
    let employeeModel = "TeamLeaderEmployee";

    for (const Model of employeeModels) {
      const found = await Model.findById(employeeId).select('name role').lean();
      if (found) {
        employee = found;
        
        // Determine department based on role
        switch (found.role) {
          case 'team-leader':
            department = 'Team Leader';
            employeeModel = 'TeamLeaderEmployee';
            break;
          case 'hr':
            department = 'HR';
            employeeModel = 'HrEmployee';
            break;
          case 'accountant':
            department = 'Accountant';
            employeeModel = 'AccountantEmployee';
            break;
          case 'telecaller':
            department = 'Tele Caller';
            employeeModel = 'TeleCallerEmployee';
            break;
          case 'project-manager':
            department = 'Project Manager';
            employeeModel = 'ProjectManagerEmployee';
            break;
          case 'sales-employee':
            department = 'Sales Employee';
            employeeModel = 'SalesEmployeeEmployee';
            break;
          default:
            department = 'Team Leader';
            employeeModel = 'TeamLeaderEmployee';
        }
        break;
      }
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Parse the date string directly without timezone conversion
    const [year, month, day] = date.split('-').map(Number);
    const attendanceDate = new Date(year, month - 1, day);
    
    // Set to beginning of day in local timezone to avoid UTC conversion issues
    attendanceDate.setHours(0, 0, 0, 0);

    console.log('Parsed attendance date:', {
      input: date,
      parsed: attendanceDate,
      iso: attendanceDate.toISOString(),
      local: attendanceDate.toLocaleDateString('en-IN')
    });

    // Find existing attendance or create new
    let attendance = await Attendance.findOne({
      employeeId,
      date: attendanceDate
    });

    if (attendance) {
      // Update existing record
      attendance.status = status;
      attendance.description = description || '';
      attendance.workType = workType || 'Office Work';
      attendance.approvedBy = req.hr.id;
      attendance.updatedAt = new Date();
      
      console.log('Updating existing attendance record:', attendance._id);
    } else {
      // Create new record
      attendance = new Attendance({
        employeeId,
        employeeModel,
        name: employee.name,
        department,
        date: attendanceDate,
        status,
        description: description || '',
        workType: workType || 'Office Work',
        approvedBy: req.hr.id
      });
      
      console.log('Creating new attendance record for date:', attendanceDate.toLocaleDateString('en-IN'));
    }

    await attendance.save();

    console.log('Attendance saved successfully:', {
      id: attendance._id,
      date: attendance.date.toLocaleDateString('en-IN'),
      status: attendance.status,
      isNew: attendance.isNew
    });

    res.json({
      success: true,
      message: attendance.isNew ? 'Attendance created successfully' : 'Attendance updated successfully',
      data: attendance
    });

  } catch (error) {
    console.error('Error creating/updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update attendance',
      error: error.message
    });
  }
});


module.exports = router;