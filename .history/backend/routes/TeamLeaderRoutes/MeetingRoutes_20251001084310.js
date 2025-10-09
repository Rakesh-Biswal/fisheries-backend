const express = require("express");
const Meeting = require("../../models/TEAMLEADER/Meeting");
const TeamLeaderEmployee = require("../../models/TEAMLEADER/TeamLeaderEmployee");
const SalesEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee");
const ProjectManager = require("../../models/PROJECTMANAGER/ProjectManagerEmployee");
const { authenticateToken } = require("../../middleware/authMiddleware");

const router = express.Router();

// GET /api/team-leader/meetings - Get all meetings
router.get("/", authenticateToken, async (req, res) => {
  try {
    const teamLeaderId = req.user.id;
    
    const meetings = await Meeting.find({ organizer: teamLeaderId })
      .sort({ createdAt: -1 });

    console.log("Fetched meetings:", meetings.length); // Debug log

    res.json({
      success: true,
      data: meetings,
      count: meetings.length,
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
      error: error.message,
    });
  }
});

// POST /api/team-leader/meetings - Create new meeting
router.post("/", authenticateToken, async (req, res) => {
  try {
    const teamLeaderId = req.user.id;
    const {
      title,
      description,
      googleMeetLink,
      participants,
      timeSlots,
      agenda,
      meetingType,
      priority
    } = req.body;

    console.log("Received meeting data:", {
      title,
      participantsCount: participants?.length,
      timeSlotsCount: timeSlots?.length,
      teamLeaderId
    }); // Debug log

    // Validate required fields
    if (!title || !googleMeetLink) {
      return res.status(400).json({
        success: false,
        message: "Title and Google Meet link are required",
      });
    }

    if (!timeSlots || timeSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one time slot is required",
      });
    }

    // Verify team leader exists
    const teamLeader = await TeamLeaderEmployee.findById(teamLeaderId);
    if (!teamLeader) {
      return res.status(404).json({
        success: false,
        message: "Team leader not found",
      });
    }

    // Create meeting with simplified structure
    const meeting = new Meeting({
      title,
      description: description || '',
      googleMeetLink,
      organizer: teamLeaderId,
      participants: participants || [],
      timeSlots: timeSlots.map(slot => ({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime || calculateEndTime(slot.startTime),
        status: 'scheduled'
      })),
      agenda: agenda || '',
      meetingType: meetingType || 'team',
      priority: priority || 'medium',
      status: 'scheduled'
    });

    const savedMeeting = await meeting.save();
    console.log("Meeting saved successfully:", savedMeeting._id); // Debug log

    res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      data: savedMeeting,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create meeting",
      error: error.message,
    });
  }
});

// GET /api/team-leader/meetings/employees - Get available employees
router.get("/employees/available", authenticateToken, async (req, res) => {
  try {
    // Get sales employees
    const salesEmployees = await SalesEmployee.find({ status: "active" })
      .select('name email phone designation')
      .lean();

    // Get project managers
    const projectManagers = await ProjectManager.find({ status: "active" })
      .select('name email phone designation')
      .lean();

    const allEmployees = [
      ...salesEmployees.map(emp => ({
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        designation: emp.designation,
        employeeType: 'sales'
      })),
      ...projectManagers.map(emp => ({
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        designation: emp.designation,
        employeeType: 'project_manager'
      }))
    ];

    res.json({
      success: true,
      data: allEmployees,
      count: allEmployees.length,
    });
  } catch (error) {
    console.error("Error fetching available employees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error: error.message,
    });
  }
});

// GET /api/team-leader/meetings/calendar/events - Get calendar events
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
      'timeSlots.date': {
        $gte: startDate,
        $lte: endDate
      }
    }).select('title timeSlots participants meetingType status googleMeetLink');

    // Format for calendar
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

    res.json({
      success: true,
      data: calendarEvents,
      count: calendarEvents.length,
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch calendar events",
      error: error.message,
    });
  }
});

// Helper function to calculate end time
function calculateEndTime(startTime, duration = 60) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate.getTime() + duration * 60000);
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}

module.exports = router;