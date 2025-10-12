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
    
    if (role !== 'team-leader') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Team Leader role required."
      });
    }

    // Team Leader can see meetings where team_leader department is invited
    const meetings = await Meeting.find({
      'invitedDepartments.department': 'team_leader',
      'invitedDepartments.invitedEmployees.employeeId': employeeId
    }).sort({ 'schedule.date': 1, 'schedule.startTime': 1 });

    res.json({
      success: true,
      data: meetings
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