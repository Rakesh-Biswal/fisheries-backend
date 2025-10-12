const express = require("express");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("./");

const router = express.Router();

/**
 * GET /api/tl/meetings/fetch-all - Get all meetings for Team Leader
 */
router.get("/fetch-all", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    console.log("📊 Fetching meetings for Team Leader:", { employeeId, role });

    if (role !== 'team-leader') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Team Leader role required."
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      status, 
      date 
    } = req.query;

    // Build filter - Team Leader can see meetings where team_leader department is invited
    let filter = {
      'invitedDepartments.department': 'team_leader',
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

    console.log(`✅ Found ${meetings.length} meetings for Team Leader`);

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
    console.error("❌ Error fetching Team Leader meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;