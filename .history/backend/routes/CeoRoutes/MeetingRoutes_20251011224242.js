const express = require("express");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("./CeoAuthMiddlewear");

const router = express.Router();

/**
 * GET /api/ceo/meetings/fetch-all - Get all meetings for CEO
 */
router.get("/fetch-all", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    if (role !== 'ceo') {
      return res.status(403).json({
        success: false,
        message: "Access denied. CEO role required."
      });
    }

    // CEO can see meetings where CEO department is invited
    const meetings = await Meeting.find({
      'invitedDepartments.department': 'ceo'
    }).sort({ 'schedule.date': 1, 'schedule.startTime': 1 });

    res.json({
      success: true,
      data: meetings
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

module.exports = router;