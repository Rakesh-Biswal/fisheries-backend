const express = require("express");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("./HrAuthMiddlewear"); // Your custom HR middleware

const router = express.Router();

/**
 * GET /api/hr/meetings - Get all meetings for specific HR employee
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, name, role, empCode } = req.user;
    
    console.log("📊 Fetching meetings for HR:", { employeeId, name, role, empCode });

    // Verify user is HR
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

    console.log("🔍 Query parameters:", { page, limit, status, date, type, department });

    // Build filter - HR can see meetings they organized or are participating in
    let filter = {
      $or: [
        { 'organizer.employeeId': employeeId }, // Meetings they organized
        { 'participants.employeeId': employeeId }, // Meetings they're invited to
        { 'departments.department': 'hr' } // All HR department meetings
      ]
    };

    // Additional filters
    if (status) filter.status = status;
    if (date) filter['schedule.date'] = date;
    if (type) filter.meetingType = type;
    if (department) filter['departments.department'] = department;

    console.log("🔍 Final filter:", JSON.stringify(filter, null, 2));

    const meetings = await Meeting.find(filter)
      .sort({ 'schedule.date': 1, 'schedule.startTime': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Meeting.countDocuments(filter);

    console.log(`✅ Found ${meetings.length} meetings out of ${total} total`);

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
 * POST /api/hr/meetings - Create new meeting as HR employee
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, name, companyEmail, role, empCode } = req.user;
    
    console.log("📝 Meeting creation request by HR:", { 
      employeeId, 
      name, 
      companyEmail, 
      role, 
      empCode 
    });

    // Verify user is HR
    if (role !== 'hr') {
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

    // Build organizer info using HR employee data
    const organizer = {
      employeeId: employeeId,
      employeeModel: , // Reference to HR collection
      name: name,
      email: companyEmail,
      designation: 'HR Executive', // From business data or default
      empCode: empCode // Include employee code for reference
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
      createdByModel: 'HR', // Specific to HR collection
      status: 'scheduled'
    };

    console.log("💾 Saving meeting data for HR:", meetingData);

    const meeting = new Meeting(meetingData);
    const savedMeeting = await meeting.save();

    console.log("✅ Meeting created successfully by HR:", { 
      meetingId: savedMeeting._id,
      createdBy: name,
      empCode 
    });

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
    
    if (role !== 'hr') {
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
 * GET /api/hr/meetings/stats - Get HR-specific meeting statistics
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const today = new Date().toISOString().split('T')[0];

    console.log("📈 Fetching meeting stats for HR:", { employeeId, today });

    // Get meetings where this specific HR is organizer or participant
    const stats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { 'organizer.employeeId': employeeId }, // Meetings they organized
            { 'participants.employeeId': employeeId }, // Meetings they're participating in
            { 'departments.department': 'hr' } // All HR department meetings
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

    // Today's meetings for this HR
    const todaysMeetings = await Meeting.countDocuments({
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'participants.employeeId': employeeId },
        { 'departments.department': 'hr' }
      ],
      'schedule.date': today
    });

    // Upcoming meetings (next 7 days) for this HR
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

    console.log("📈 Meeting stats calculated:", formattedStats);

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
 * GET /api/hr/meetings/:id - Get specific meeting details
 */
router.get("/:id", authenticateToken, async (req, res) => {
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
        { 'participants.employeeId': employeeId },
        { 'departments.department': 'hr' }
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

module.exports = router;