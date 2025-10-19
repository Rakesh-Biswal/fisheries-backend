const express = require("express");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("./HrAuthMiddlewear"); // Fixed path

const router = express.Router();

/**
 * DEBUG: Test authentication endpoint
 */
router.get("/debug-auth", authenticateToken, async (req, res) => {
  console.log("🔍 Debug Auth - req.user:", req.user);
  console.log("🔍 Debug Auth - user ID:", req.user._id);
  console.log("🔍 Debug Auth - user role:", req.user.role);
  
  res.json({
    success: true,
    message: "Authentication successful",
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      employeeId: req.user.employeeId
    }
  });
});

/**
 * GET /api/hr/meetings - Get all meetings for specific HR
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Fetching meetings for HR:", req.user._id);
    
    const hrId = req.user._id; // HR's MongoDB _id
    const hrEmployeeId = req.user.employeeId; // HR's custom employee ID

    // Verify user is HR
    if (req.user.role !== 'hr' || req.user.role !== 'HR') {
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

    // Build filter - HR can see meetings they organized or are participating in
    let filter = {
      $or: [
        { 'organizer.employeeId': hrId }, // Meetings they organized
        { 'participants.employeeId': hrId }, // Meetings they're participating in
        { 'createdBy': hrId }, // Meetings they created
        { 'departments.department': 'hr' } // All HR department meetings
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
    console.log("📝 Meeting creation request from HR:", req.user._id);
    
    const hrId = req.user._id;
    const { name, email, role, employeeId } = req.user;

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

    // Build organizer info using HR employee data
    const organizer = {
      employeeId: hrId, // Using MongoDB _id as employeeId
      employeeModel: 'HrEmployee', // Your HR model name
      name: name,
      email: email,
      designation: role,
      employeeCode: employeeId // Custom employee ID if available
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
      createdBy: hrId, // Store HR's MongoDB _id
      createdByModel: 'HrEmployee', // Your HR model
      status: 'scheduled'
    };

    console.log("💾 Saving meeting data for HR:", hrId);

    const meeting = new Meeting(meetingData);
    const savedMeeting = await meeting.save();

    console.log("✅ Meeting created successfully by HR:", hrId);

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
 * GET /api/hr/meetings/stats - Get HR-specific meeting statistics
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const hrId = req.user._id;
    const { role } = req.user;
    
    if (role !== 'HR') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get meetings specific to this HR
    const stats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { 'organizer.employeeId': hrId }, // Meetings they organized
            { 'participants.employeeId': hrId }, // Meetings they're participating in
            { 'createdBy': hrId }, // Meetings they created
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
        { 'organizer.employeeId': hrId },
        { 'participants.employeeId': hrId },
        { 'createdBy': hrId },
        { 'departments.department': 'hr' }
      ],
      'schedule.date': today
    });

    // Upcoming meetings (next 7 days) for this HR
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingMeetings = await Meeting.countDocuments({
      $or: [
        { 'organizer.employeeId': hrId },
        { 'participants.employeeId': hrId },
        { 'createdBy': hrId },
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

/**
 * GET /api/hr/meetings/:id - Get specific meeting details
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const hrId = req.user._id;
    const meetingId = req.params.id;

    const meeting = await Meeting.findOne({
      _id: meetingId,
      $or: [
        { 'organizer.employeeId': hrId },
        { 'participants.employeeId': hrId },
        { 'createdBy': hrId },
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

/**
 * PUT /api/hr/meetings/:id - Update meeting
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const hrId = req.user._id;
    const meetingId = req.params.id;

    // Check if meeting exists and HR has access
    const existingMeeting = await Meeting.findOne({
      _id: meetingId,
      'organizer.employeeId': hrId // Only organizer can update
    });

    if (!existingMeeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or you don't have permission to update it"
      });
    }

    const updatedMeeting = await Meeting.findByIdAndUpdate(
      meetingId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Meeting updated successfully",
      data: updatedMeeting
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
 * DELETE /api/hr/meetings/:id - Delete meeting
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const hrId = req.user._id;
    const meetingId = req.params.id;

    // Check if meeting exists and HR has access
    const existingMeeting = await Meeting.findOne({
      _id: meetingId,
      'organizer.employeeId': hrId // Only organizer can delete
    });

    if (!existingMeeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or you don't have permission to delete it"
      });
    }

    await Meeting.findByIdAndDelete(meetingId);

    res.json({
      success: true,
      message: "Meeting deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting meeting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete meeting",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;