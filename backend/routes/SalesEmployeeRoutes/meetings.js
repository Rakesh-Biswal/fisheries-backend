const express = require("express");
const mongoose = require("mongoose");
const Meeting = require("../../models/Meetings/Meeting");
const { SalesEmployeeAuth } = require("../../middleware/authMiddleware");
const router = express.Router();

// Get all meetings for sales employee (role-based)
router.get("/", SalesEmployeeAuth, async (req, res) => {
  try {
    const salesEmployeeId = req.salesEmployee.id;
    const salesEmployeeEmail = req.salesEmployee.email;
    const salesEmployeeRole = "sales-employee"; // Get from auth if available

    console.log("🔍 Fetching meetings for sales employee:", salesEmployeeEmail);

    // Find meetings where the sales employee is a participant by email or ID
    // AND where the department includes sales-employee
    const meetings = await Meeting.find({
      $and: [
        {
          $or: [
            { "participants.email": salesEmployeeEmail },
            { "participants._id": salesEmployeeId },
            // Also check by role/department
            { "participants.department": "sales-employee" },
          ],
        },
        {
          $or: [
            { "participants.department": "sales-employee" },
            { departments: "sales-employee" },
          ],
        },
      ],
    })
      .populate("organizer", "name photo companyEmail")
      .sort({ meetingDate: -1, startTime: -1 });

    console.log(`✅ Found ${meetings.length} meetings for sales employee`);

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

// Get meeting history
router.get("/history", SalesEmployeeAuth, async (req, res) => {
  try {
    const salesEmployeeEmail = req.salesEmployee.email;

    console.log("📅 Fetching meeting history for:", salesEmployeeEmail);

    const meetings = await Meeting.find({
      $or: [
        { "participants.email": salesEmployeeEmail },
        { "participants._id": req.salesEmployee.id },
      ],
      $or: [
        { status: "completed" },
        { meetingDate: { $lt: new Date().toISOString().split("T")[0] } },
      ],
    })
      .populate("organizer", "name photo companyEmail")
      .sort({ meetingDate: -1, startTime: -1 });

    console.log(`✅ Found ${meetings.length} historical meetings`);

    const formattedMeetings = meetings.map((meeting) => ({
      _id: meeting._id,
      title: meeting.title,
      description: meeting.description,
      meetingDate: meeting.meetingDate,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status,
      organizer: meeting.organizer
        ? {
            _id: meeting.organizer._id,
            name: meeting.organizer.name,
            email: meeting.organizer.companyEmail,
          }
        : meeting.organizer,
    }));

    res.json({
      success: true,
      data: formattedMeetings,
      count: formattedMeetings.length,
      message: `Found ${formattedMeetings.length} historical meetings`,
    });
  } catch (error) {
    console.error("❌ Error fetching meeting history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting history",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get meeting details by ID
router.get("/:id", SalesEmployeeAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const salesEmployeeEmail = req.salesEmployee.email;

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

module.exports = router;
