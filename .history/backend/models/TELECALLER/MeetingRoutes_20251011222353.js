const express = require("express");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("../../middleware/TelecallerAuthMiddleware");

const router = express.Router();

/**
 * GET /api/telecaller/meetings/fetch-all - Get all meetings for Telecaller
 */
router.get("/fetch-all", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, name, role } = req.user;
    
    console.log("📊 Fetching meetings for Telecaller:", { employeeId, name, role });

    if (role !== 'telecaller') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Telecaller role required."
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      status, 
      date 
    } = req.query;

    // Build filter - Telecaller can see meetings where telecaller department is invited
    let filter = {
      'invitedDepartments.department': 'telecaller',
      'invitedDepartments.invitedEmployees.employeeId': employeeId
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

    console.log(`✅ Found ${meetings.length} meetings for Telecaller`);

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
    console.error("❌ Error fetching Telecaller meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/telecaller/meetings/fetch-stats - Get Telecaller meeting statistics
 */
router.get("/fetch-stats", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    if (role !== 'telecaller') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Telecaller role required."
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get meetings where this Telecaller is invited
    const stats = await Meeting.aggregate([
      {
        $match: {
          'invitedDepartments.department': 'telecaller',
          'invitedDepartments.invitedEmployees.employeeId': employeeId
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
      'invitedDepartments.department': 'telecaller',
      'invitedDepartments.invitedEmployees.employeeId': employeeId,
      'schedule.date': today,
      status: { $in: ['scheduled', 'in_progress'] }
    });

    // Upcoming meetings (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingMeetings = await Meeting.countDocuments({
      'invitedDepartments.department': 'telecaller',
      'invitedDepartments.invitedEmployees.employeeId': employeeId,
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
    console.error("❌ Error fetching Telecaller meeting stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/telecaller/meetings/fetch-by-id/:id - Get specific meeting details
 */
router.get("/fetch-by-id/:id", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { id } = req.params;

    if (role !== 'telecaller') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Telecaller role required."
      });
    }

    const meeting = await Meeting.findOne({
      _id: id,
      'invitedDepartments.department': 'telecaller',
      'invitedDepartments.invitedEmployees.employeeId': employeeId
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
 * PUT /api/telecaller/meetings/update-response/:id - Update meeting response status
 */
router.put("/update-response/:id", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    if (role !== 'telecaller') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Telecaller role required."
      });
    }

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'accepted' or 'declined'"
      });
    }

    const meeting = await Meeting.findOneAndUpdate(
      { 
        _id: id,
        'invitedDepartments.department': 'telecaller',
        'invitedDepartments.invitedEmployees.employeeId': employeeId
      },
      { 
        $set: { 
          'invitedDepartments.$[dept].invitedEmployees.$[emp].status': status,
          'invitedDepartments.$[dept].invitedEmployees.$[emp].responseDate': new Date()
        } 
      },
      { 
        arrayFilters: [
          { 'dept.department': 'telecaller' },
          { 'emp.employeeId': employeeId }
        ],
        new: true
      }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or access denied"
      });
    }

    res.json({
      success: true,
      message: `Meeting ${status} successfully`,
      data: meeting
    });
  } catch (error) {
    console.error("❌ Error updating meeting response:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meeting response",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;