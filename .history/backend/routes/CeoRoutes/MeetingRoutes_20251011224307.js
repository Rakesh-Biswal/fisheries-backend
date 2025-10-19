const express = require("express");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("./");

const router = express.Router();

/**
 * GET /api/ceo/meetings/fetch-all - Get all meetings for CEO
 */
router.get("/fetch-all", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    console.log("📊 Fetching meetings for CEO:", { employeeId, role });

    if (role !== 'ceo') {
      return res.status(403).json({
        success: false,
        message: "Access denied. CEO role required."
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      status, 
      date 
    } = req.query;

    // Build filter - CEO can see meetings where CEO department is invited
    let filter = {
      'invitedDepartments.department': 'ceo'
    };

    // Additional filters
    if (status) filter.status = status;
    if (date) filter['schedule.date'] = date;

    const meetings = await Meeting.find(filter)
      .sort({ 'schedule.date': 1, 'schedule.startTime': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Meeting.countDocuments(filter);

    console.log(`✅ Found ${meetings.length} meetings for CEO`);

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
    console.error("❌ Error fetching CEO meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/ceo/meetings/fetch-stats - Get CEO meeting statistics
 */
router.get("/fetch-stats", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    if (role !== 'ceo') {
      return res.status(403).json({
        success: false,
        message: "Access denied. CEO role required."
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get meetings where CEO is invited
    const stats = await Meeting.aggregate([
      {
        $match: {
          'invitedDepartments.department': 'ceo'
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
      'invitedDepartments.department': 'ceo',
      'schedule.date': today,
      status: { $in: ['scheduled', 'in_progress'] }
    });

    // Upcoming meetings (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingMeetings = await Meeting.countDocuments({
      'invitedDepartments.department': 'ceo',
      'schedule.date': { 
        $gte: today, 
        $lte: nextWeek.toISOString().split('T')[0] 
      },
      status: 'scheduled'
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
    console.error("❌ Error fetching CEO meeting stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/ceo/meetings/fetch-by-id/:id - Get specific meeting details
 */
router.get("/fetch-by-id/:id", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { id } = req.params;

    if (role !== 'ceo') {
      return res.status(403).json({
        success: false,
        message: "Access denied. CEO role required."
      });
    }

    const meeting = await Meeting.findOne({
      _id: id,
      'invitedDepartments.department': 'ceo'
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