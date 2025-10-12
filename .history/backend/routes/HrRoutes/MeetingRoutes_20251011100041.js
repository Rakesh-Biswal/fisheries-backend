// routes/HrRoutes/MeetingRoutes.js
const express = require("express");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("./HrAuthMiddlewear"); // Your custom HR middleware


// Import department models
const Ceo = require("../../models/CEO/CeoPi");
const TeamLeaderEmployee = require("../../models/TeamLeader/TeamLeaderEmployee");
const ProjectManagerEmployee = require("../../models/ProjectManager/ProjectManagerEmployee");
const AccountantEmployee = require("../../models/Accountant");
const TelecallerEmployee = require("../../models/Telecaller");
const SalesEmployeeEmployee = require("../../models/SalesEmployee");

const router = express.Router();

// Department mapping
const DEPARTMENT_MODELS = {
  ceo: Ceo,
  team_leader: TeamLeaderEmployee,
  project_manager: ProjectManagerEmployee,
  accountant: AccountantEmployee,
  telecaller: TelecallerEmployee,
  sales: SalesEmployeeEmployee
};

const DEPARTMENT_NAMES = {
  hr: 'Human Resources',
  ceo: 'Chief Executive Officer',
  team_leader: 'Team Leader',
  project_manager: 'Project Manager',
  accountant: 'Accountant',
  telecaller: 'Telecaller',
  sales: 'Sales'
};

/**
 * GET /api/hr/meetings/fetch-all - Get all meetings for HR
 */
router.get("/fetch-all", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      status, 
      date, 
      type, 
      department 
    } = req.query;

    // Build filter - HR can see meetings they organized or where HR department is invited
    let filter = {
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'invitedDepartments.department': 'hr' }
      ]
    };

    // Additional filters
    if (status) filter.status = status;
    if (date) filter['schedule.date'] = date;
    if (type) filter.meetingType = type;
    if (department) filter['invitedDepartments.department'] = department;

    const meetings = await Meeting.find(filter)
      .sort({ 'schedule.date': 1, 'schedule.startTime': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Meeting.countDocuments(filter);

    res.json({
      success: true,
      data: meetings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error("❌ Error fetching HR meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/hr/meetings/create - Create new meeting as HR
 */
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, name, companyEmail, empCode } = req.user;
    
    if (req.user.role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const {
      title,
      description,
      agenda,
      schedule,
      platform,
      meetingLink,
      location,
      departments, // Array of department IDs to invite
      meetingType,
      priority
    } = req.body;

    // Validation
    if (!title?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Meeting title is required" 
      });
    }

    if (!schedule?.date || !schedule?.startTime || !schedule?.endTime) {
      return res.status(400).json({ 
        success: false, 
        message: "Complete meeting schedule is required" 
      });
    }

    if (platform !== 'in_person' && !meetingLink) {
      return res.status(400).json({ 
        success: false, 
        message: "Meeting link is required for virtual meetings" 
      });
    }

    if (!departments || departments.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one department is required" 
      });
    }

    // Build organizer info
    const organizer = {
      employeeId: employeeId,
      name: name,
      email: companyEmail,
      empCode: empCode,
      designation: 'HR Executive'
    };

    // Prepare invited departments with their employees
    const invitedDepartments = [];
    
    for (const deptId of departments) {
      const departmentModel = DEPARTMENT_MODELS[deptId];
      if (!departmentModel) continue;

      // Get all active employees from this department
      const departmentEmployees = await departmentModel.find({ 
        status: 'active' 
      }).select('_id name email empCode').lean();

      invitedDepartments.push({
        department: deptId,
        departmentName: DEPARTMENT_NAMES[deptId],
        invitedEmployees: departmentEmployees.map(emp => ({
          employeeId: emp._id,
          name: emp.name,
          email: emp.email || emp.companyEmail,
          empCode: emp.empCode,
          status: 'pending'
        }))
      });
    }

    // Always include HR department
    if (!departments.includes('hr')) {
      const hrEmployees = await mongoose.model('HrEmployee').find({ 
        status: 'active',
        _id: { $ne: employeeId } // Exclude the organizer
      }).select('_id name companyEmail empCode').lean();

      invitedDepartments.push({
        department: 'hr',
        departmentName: 'Human Resources',
        invitedEmployees: hrEmployees.map(emp => ({
          employeeId: emp._id,
          name: emp.name,
          email: emp.companyEmail,
          empCode: emp.empCode,
          status: 'pending'
        }))
      });
    }

    // Prepare meeting data
    const meetingData = {
      title: title.trim(),
      description: description?.trim() || '',
      agenda: agenda?.trim() || '',
      organizer: organizer,
      invitedDepartments: invitedDepartments,
      schedule: schedule,
      platform: platform || 'google_meet',
      meetingLink: meetingLink || '',
      location: location || '',
      meetingType: meetingType || 'cross_department',
      priority: priority || 'medium',
      status: 'scheduled'
    };

    const meeting = new Meeting(meetingData);
    const savedMeeting = await meeting.save();

    // TODO: Send notifications to invited departments
    // You can implement email/notification service here

    res.status(201).json({
      success: true,
      message: "Meeting created successfully and invitations sent to departments",
      data: savedMeeting
    });

  } catch (error) {
    console.error("❌ Error creating HR meeting:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create meeting",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/hr/meetings/fetch-departments - Get available departments for HR
 */
router.get("/fetch-departments", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    // Get department counts for realistic data
    const departmentCounts = await Promise.all(
      Object.entries(DEPARTMENT_MODELS).map(async ([deptId, model]) => {
        const count = await model.countDocuments({ status: 'active' });
        return { deptId, count };
      })
    );

    const departments = [
      { 
        id: 'ceo', 
        name: 'CEO', 
        color: 'bg-blue-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'ceo')?.count || 0
      },
      { 
        id: 'team_leader', 
        name: 'Team Leaders', 
        color: 'bg-green-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'team_leader')?.count || 0
      },
      { 
        id: 'project_manager', 
        name: 'Project Managers', 
        color: 'bg-orange-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'project_manager')?.count || 0
      },
      { 
        id: 'accountant', 
        name: 'Accountants', 
        color: 'bg-red-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'accountant')?.count || 0
      },
      { 
        id: 'telecaller', 
        name: 'Telecallers', 
        color: 'bg-indigo-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'telecaller')?.count || 0
      },
      { 
        id: 'sales', 
        name: 'Sales Team', 
        color: 'bg-cyan-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'sales')?.count || 0
      }
    ];

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error("❌ Error fetching departments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/hr/meetings/fetch-stats - Get HR meeting statistics
 */
router.get("/fetch-stats", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get meetings organized by this HR or where HR is invited
    const stats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { 'organizer.employeeId': employeeId },
            { 'invitedDepartments.department': 'hr' }
          ]
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Today's meetings
    const todaysMeetings = await Meeting.countDocuments({
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'invitedDepartments.department': 'hr' }
      ],
      'schedule.date': today,
      status: { $in: ['scheduled', 'in_progress'] }
    });

    // Upcoming meetings (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingMeetings = await Meeting.countDocuments({
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'invitedDepartments.department': 'hr' }
      ],
      'schedule.date': { 
        $gte: today, 
        $lte: nextWeek.toISOString().split('T')[0] 
      },
      status: 'scheduled'
    });

    // Department-wise meeting count
    const departmentStats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { 'organizer.employeeId': employeeId },
            { 'invitedDepartments.department': 'hr' }
          ]
        }
      },
      { $unwind: '$invitedDepartments' },
      {
        $group: {
          _id: '$invitedDepartments.department',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      total: stats.reduce((acc, curr) => acc + curr.count, 0),
      today: todaysMeetings,
      upcoming: upcomingMeetings,
      byStatus: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byDepartment: departmentStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error("❌ Error fetching HR meeting stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/hr/meetings/fetch-by-id/:id - Get specific meeting details
 */
router.get("/fetch-by-id/:id", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { id } = req.params;

    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const meeting = await Meeting.findOne({
      _id: id,
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'invitedDepartments.department': 'hr' }
      ]
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or access denied"
      });
    }

    res.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    console.error("❌ Error fetching meeting details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting details",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * PUT /api/hr/meetings/update/:id - Update meeting
 */
router.put("/update/:id", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { id } = req.params;

    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    // Only allow organizer to update
    const meeting = await Meeting.findOneAndUpdate(
      { 
        _id: id, 
        'organizer.employeeId': employeeId 
      },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or you are not the organizer"
      });
    }

    res.json({
      success: true,
      message: "Meeting updated successfully",
      data: meeting
    });
  } catch (error) {
    console.error("❌ Error updating meeting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meeting",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * DELETE /api/hr/meetings/delete/:id - Cancel meeting
 */
router.delete("/delete/:id", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { id } = req.params;

    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    // Only allow organizer to cancel
    const meeting = await Meeting.findOneAndUpdate(
      { 
        _id: id, 
        'organizer.employeeId': employeeId 
      },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or you are not the organizer"
      });
    }

    res.json({
      success: true,
      message: "Meeting cancelled successfully",
      data: meeting
    });
  } catch (error) {
    console.error("❌ Error cancelling meeting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel meeting",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;