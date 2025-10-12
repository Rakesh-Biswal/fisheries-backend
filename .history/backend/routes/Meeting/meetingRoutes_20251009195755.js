const express = require("express");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("../../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/meetings - Get all meetings for authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { employeeId, role } = req.user;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      date, 
      type, 
      department 
    } = req.query;

    // Build filter based on user role and query params
    let filter = {
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'participants.employeeId': employeeId }
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
    console.error("❌ Error fetching meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/meetings - Create new meeting
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { employeeId, name, email, role } = req.user;
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
      participants
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

    // Build organizer info
    const organizer = {
      employeeId: employeeId,
      employeeModel: role,
      name: name,
      email: email,
      designation: role
    };

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
      departments: departments || [],
      meetingType: meetingType || 'team',
      priority: priority || 'medium',
      participants: participants || [],
      createdBy: employeeId,
      createdByModel: role,
      status: 'scheduled'
    };

    const meeting = new Meeting(meetingData);
    const savedMeeting = await meeting.save();

    res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      data: savedMeeting
    });

  } catch (error) {
    console.error("❌ Error creating meeting:", error);
    
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
 * GET /api/meetings/calendar/events - Get calendar events
 */
router.get("/calendar/events", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required"
      });
    }

    const meetings = await Meeting.find({
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'participants.employeeId': employeeId }
      ],
      'schedule.date': { $gte: startDate, $lte: endDate }
    }).select('title description schedule platform meetingType status organizer participants departments');

    const events = meetings.map(meeting => ({
      id: meeting._id,
      title: meeting.title,
      start: new Date(`${meeting.schedule.date}T${meeting.schedule.startTime}`),
      end: new Date(`${meeting.schedule.date}T${meeting.schedule.endTime}`),
      type: meeting.meetingType,
      status: meeting.status,
      platform: meeting.platform,
      organizer: meeting.organizer.name,
      participants: meeting.participants.length,
      departments: meeting.departments,
      extendedProps: {
        description: meeting.description,
        meetingId: meeting._id
      }
    }));

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error("❌ Error fetching calendar events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch calendar events",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/meetings/dashboard/stats - Get meeting statistics
 */
router.get("/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const stats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { 'organizer.employeeId': employeeId },
            { 'participants.employeeId': employeeId }
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
        { 'participants.employeeId': employeeId }
      ],
      'schedule.date': today
    });

    // Upcoming meetings (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingMeetings = await Meeting.countDocuments({
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'participants.employeeId': employeeId }
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
    console.error("❌ Error fetching meeting stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;