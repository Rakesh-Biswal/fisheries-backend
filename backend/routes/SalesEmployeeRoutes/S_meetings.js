const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Meeting = require("../../models/Meetings/Meeting"); // Adjust path as needed
const { SalesEmployeeAuth } = require("../../middleware/authMiddleware");

// Get all meetings for sales employee (where they are participants)
router.get("/", SalesEmployeeAuth, async (req, res) => {
  try {
    const salesEmployeeId = req.salesEmployee.id;
    const salesEmployeeEmail = req.salesEmployee.companyEmail;

    console.log("🔍 Fetching meetings for sales employee:", salesEmployeeEmail);

    // Find meetings where the sales employee is a participant
    // Adjust this query based on your Meeting model structure
    const meetings = await Meeting.find({
      $or: [
        { "participants.email": salesEmployeeEmail },
        { "participants._id": salesEmployeeId },
      ],
    })
      .populate("organizer", "name photo companyEmail")
      .sort({ meetingDate: -1, startTime: -1 });

    console.log(`✅ Found ${meetings.length} meetings for sales employee`);

    // Format the response to match your frontend expectations
    const formattedMeetings = meetings.map((meeting) => ({
      _id: meeting._id,
      title: meeting.title,
      description: meeting.description,
      googleMeetLink: meeting.meetingLink || meeting.googleMeetLink,
      googleSheetLink: meeting.googleSheetLink,
      organizer: meeting.organizer
        ? {
            _id: meeting.organizer._id,
            name: meeting.organizer.name,
            photo: meeting.organizer.photo,
            email: meeting.organizer.companyEmail,
          }
        : meeting.organizer,
      participants: meeting.participants || [],
      timeSlots: meeting.timeSlots || [
        {
          date: meeting.meetingDate,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          status: meeting.status || "scheduled",
          _id: meeting._id,
        },
      ],
      agenda: meeting.agenda,
      meetingType: meeting.meetingType || meeting.platform,
      priority: meeting.priority,
      status: meeting.status,
      createdAt: meeting.createdAt,
    }));

    res.json({
      success: true,
      data: formattedMeetings,
      count: formattedMeetings.length,
      message: `Found ${formattedMeetings.length} meetings`,
    });
  } catch (error) {
    console.error("❌ Error fetching meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get meeting details by ID for sales employee
router.get("/:id", SalesEmployeeAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const salesEmployeeEmail = req.salesEmployee.companyEmail;

    const meeting = await Meeting.findOne({
      _id: id,
      $or: [
        { "participants.email": salesEmployeeEmail },
        { "participants._id": req.salesEmployee.id },
      ],
    }).populate("organizer", "name photo companyEmail");

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or access denied",
      });
    }

    res.json({
      success: true,
      data: meeting,
      message: "Meeting details fetched successfully",
    });
  } catch (error) {
    console.error("❌ Error fetching meeting details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get meeting statistics for sales employee
router.get("/stats/overview", SalesEmployeeAuth, async (req, res) => {
  try {
    const salesEmployeeEmail = req.salesEmployee.companyEmail;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { "participants.email": salesEmployeeEmail },
            {
              "participants._id": new mongoose.Types.ObjectId(
                req.salesEmployee.id
              ),
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalMeetings: { $sum: 1 },
          todayMeetings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$meetingDate", today] },
                    { $lt: ["$meetingDate", tomorrow] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          upcoming: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$meetingDate", new Date()] },
                    { $eq: ["$status", "scheduled"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalMeetings: 0,
      todayMeetings: 0,
      upcoming: 0,
      completed: 0,
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching meeting stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting statistics",
    });
  }
});

module.exports = router;