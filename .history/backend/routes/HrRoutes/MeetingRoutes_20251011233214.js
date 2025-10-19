

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