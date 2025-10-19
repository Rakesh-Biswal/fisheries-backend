const express = require("express");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("./HrAuthMiddlewear");

const router = express.Router();

/**
 * GET /api/hr/meetings - Get all meetings for HR
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { employeeId, role } = req.user;
    const sc = 
    // Verify user is HR
    if (role !== 'HR') {
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

    // Build filter - HR can see all meetings they organized or are participating in
    let filter = {
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'participants.employeeId': employeeId },
        { 'departments.department': 'hr' }
      ]
    };

    // Additional filters
    if (status) filter.status = status;
    if (date) filter['schedule.date'] = date;
    if (type) filter.meetingType = type;
    if (department) filter['departments.department'] = department;

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
 * POST /api/hr/meetings - Create new meeting as HR
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { employeeId, name, email, role } = req.user;
    
    // Verify user is HR
    if (role !== 'HR') {
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
      departments,
      meetingType,
      priority,
      participants = []
    } = req.body;

    console.log("📥 Received meeting creation request:", {
      title,
      schedule,
      platform,
      departments,
      meetingType
    });

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Meeting title is required" 
      });
    }

    if (!schedule || !schedule.date || !schedule.startTime || !schedule.endTime) {
      return res.status(400).json({ 
        success: false, 
        message: "Meeting schedule is required" 
      });
    }

    // Validate meeting link for virtual meetings
    if (platform !== 'in_person' && !meetingLink) {
      return res.status(400).json({ 
        success: false, 
        message: "Meeting link is required for virtual meetings" 
      });
    }

    // Validate departments
    if (!departments || departments.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one department is required" 
      });
    }

    // Build organizer info
    const organizer = {
      employeeId: employeeId,
      employeeModel: role,
      name: name,
      email: email,
      designation: role
    };

    // Ensure HR department is included if not specified
    const meetingDepartments = Array.isArray(departments) ? [...departments] : [];
    if (!meetingDepartments.some(dept => dept.department === 'hr')) {
      meetingDepartments.push({
        department: 'hr',
        role: 'organizer'
      });
    }

    // Prepare meeting data
    const meetingData = {
      title: title.trim(),
      description: description?.trim() || '',
      agenda: agenda?.trim() || '',
      organizer: organizer,
      schedule: schedule,
      platform: platform || 'google_meet',
      meetingLink: meetingLink || '',
      location: location || '',
      departments: meetingDepartments,
      meetingType: meetingType || 'team',
      priority: priority || 'medium',
      participants: participants,
      createdBy: employeeId,
      createdByModel: role,
      status: 'scheduled'
    };

    console.log("💾 Saving meeting data:", meetingData);

    const meeting = new Meeting(meetingData);
    const savedMeeting = await meeting.save();

    console.log("✅ Meeting created successfully:", savedMeeting._id);

    res.status(201).json({
      success: true,
      message: "Meeting created successfully",
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
 * GET /api/hr/meetings/departments - Get available departments for HR
 */
router.get("/departments", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'HR') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const departments = [
      { id: 'hr', name: 'HR', color: 'bg-purple-500' },
      { id: 'ceo', name: 'CEO', color: 'bg-blue-500' },
      { id: 'team_leader', name: 'Team Leader', color: 'bg-green-500' },
      { id: 'project_manager', name: 'Project Manager', color: 'bg-orange-500' },
      { id: 'accountant', name: 'Accountant', color: 'bg-red-500' },
      { id: 'telecaller', name: 'Telecaller', color: 'bg-indigo-500' },
      { id: 'sales', name: 'Sales', color: 'bg-cyan-500' }
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
 * GET /api/hr/meetings/stats - Get HR meeting statistics
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const { employeeId, role } = req.user;
    
    if (role !== 'HR') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get meetings where HR is organizer or participant
    const stats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { 'organizer.employeeId': employeeId },
            { 'participants.employeeId': employeeId },
            { 'departments.department': 'hr' }
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
        { 'participants.employeeId': employeeId },
        { 'departments.department': 'hr' }
      ],
      'schedule.date': today
    });

    // Upcoming meetings (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingMeetings = await Meeting.countDocuments({
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'participants.employeeId': employeeId },
        { 'departments.department': 'hr' }
      ],
      'schedule.date': { 
        $gte: today, 
        $lte: nextWeek.toISOString().split('T')[0] 
      },
      status: { $in: ['scheduled', 'draft'] }
    });

    const formattedStats = {
      total: stats.reduce((acc, curr) => acc + curr.count, 0),
      today: todaysMeetings,
      upcoming: upcomingMeetings,
      byStatus: stats.reduce((acc, curr) => {
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

module.exports = router;