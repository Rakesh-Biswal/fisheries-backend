/* const express = require("express");
const Meeting = require("../../models/TEAMLEADER/Meeting");
const TeamLeaderEmployee = require("../../models/TEAMLEADER/TeamLeaderEmployee");
const SalesEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee");
const ProjectManager = require("../../models/PROJECTMANAGER/ProjectManagerEmployee");
const { authenticateToken } = require("../../middleware/authMiddleware");

const router = express.Router();

/**
 * ========================
 * GET /api/team-leader/meetings
 * Fetch all meetings for logged-in team leader
 * ========================
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const teamLeaderId = req.user.id;

    const meetings = await Meeting.find({ organizer: teamLeaderId })
      .sort({ createdAt: -1 });

    console.log("📅 Fetched meetings:", meetings.length);

    res.json({
      success: true,
      data: meetings,
      count: meetings.length,
    });
  } catch (error) {
    console.error("❌ Error fetching meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
      error: error.message,
    });
  }
});

/**
 * ========================
 * POST /api/team-leader/meetings
 * Create new meeting
 * ========================
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const teamLeaderId = req.user.id;
    const {
      title,
      description,
      googleMeetLink,
      participants = [],
      timeSlots,
      agenda,
      meetingType,
      priority
    } = req.body;

    console.log("🔍 Received meeting data:", {
      title,
      googleMeetLink,
      participantsCount: participants.length,
      timeSlotsCount: timeSlots?.length,
      teamLeaderId
    });

    // === Enhanced Validation ===
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Meeting title is required" });
    }

    if (!googleMeetLink || !googleMeetLink.trim()) {
      return res.status(400).json({ success: false, message: "Google Meet link is required" });
    }

    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({ success: false, message: "At least one time slot is required" });
    }

    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      if (!slot.date || !slot.startTime) {
        return res.status(400).json({
          success: false,
          message: `Time slot ${i + 1} is missing date or start time`,
        });
      }
    }

    // === Verify Team Leader Exists (Optional) ===
    try {
      const teamLeader = await TeamLeaderEmployee.findById(teamLeaderId);
      if (!teamLeader) {
        console.warn("⚠️ Team leader not found, but continuing:", teamLeaderId);
      }
    } catch (dbError) {
      console.warn("⚠️ Team leader verification skipped:", dbError.message);
    }

    // === Build Meeting Data ===
    const meetingData = {
      title: title.trim(),
      description: (description || agenda || '').trim(),
      googleMeetLink: googleMeetLink.trim(),
      organizer: teamLeaderId,
      participants: participants.map(p => ({
        employeeId: p.employeeId,
        name: p.name || 'Unknown',
        email: p.email || '',
        employeeType: p.employeeType || 'sales',
        status: 'pending'
      })),
      timeSlots: timeSlots.map(slot => ({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime || calculateEndTime(slot.startTime),
        status: 'scheduled'
      })),
      agenda: (agenda || description || '').trim(),
      meetingType: meetingType || 'team',
      priority: priority || 'medium',
      status: 'scheduled'
    };

    console.log("💾 Saving meeting data:", meetingData);

    // === Save Meeting ===
    const meeting = new Meeting(meetingData);
    const savedMeeting = await meeting.save();
    console.log("✅ Meeting saved successfully:", savedMeeting._id);

    // Populate before returning
    const populatedMeeting = await Meeting.findById(savedMeeting._id);

    res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      data: populatedMeeting,
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

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Meeting with similar details already exists",
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
 * ========================
 * GET /api/team-leader/meetings/employees/available
 * Fetch available employees (Sales + PMs)
 * ========================
 */
router.get("/employees/available", authenticateToken, async (req, res) => {
  try {
    const salesEmployees = await SalesEmployee.find({ status: "active" })
      .select("name email phone designation")
      .lean();

    const projectManagers = await ProjectManager.find({ status: "active" })
      .select("name email phone designation")
      .lean();

    const allEmployees = [
      ...salesEmployees.map(emp => ({
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        designation: emp.designation,
        employeeType: "sales"
      })),
      ...projectManagers.map(emp => ({
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        designation: emp.designation,
        employeeType: "project_manager"
      }))
    ];

    console.log("👥 Available employees:", allEmployees.length);

    res.json({
      success: true,
      data: allEmployees,
      count: allEmployees.length,
    });
  } catch (error) {
    console.error("❌ Error fetching available employees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error: error.message,
    });
  }
});

/**
 * ========================
 * GET /api/team-leader/meetings/calendar/events
 * Fetch calendar events
 * ========================
 */
router.get("/calendar/events", authenticateToken, async (req, res) => {
  try {
    const teamLeaderId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required"
      });
    }

    const meetings = await Meeting.find({
      organizer: teamLeaderId,
      "timeSlots.date": { $gte: startDate, $lte: endDate }
    }).select("title timeSlots participants meetingType status googleMeetLink");

    const calendarEvents = meetings.flatMap(meeting =>
      meeting.timeSlots.map(slot => ({
        id: `${meeting._id}-${slot._id}`,
        title: meeting.title,
        start: new Date(`${slot.date}T${slot.startTime}`),
        end: new Date(`${slot.date}T${slot.endTime}`),
        type: meeting.meetingType,
        status: meeting.status,
        participants: meeting.participants.length,
        meetingLink: meeting.googleMeetLink,
        extendedProps: {
          meetingId: meeting._id,
          slotId: slot._id
        }
      }))
    );

    console.log("📆 Calendar events:", calendarEvents.length);

    res.json({
      success: true,
      data: calendarEvents,
      count: calendarEvents.length,
    });
  } catch (error) {
    console.error("❌ Error fetching calendar events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch calendar events",
      error: error.message,
    });
  }
});

/**
 * Helper: Auto calculate end time (default 60 min)
 */
function calculateEndTime(startTime, duration = 60) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + duration * 60000);
  return `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
}

module.exports = router;
 */