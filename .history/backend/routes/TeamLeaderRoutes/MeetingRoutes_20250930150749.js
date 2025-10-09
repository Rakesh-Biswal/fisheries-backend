const express = require("express");
const mongoose = require("mongoose");
const Meeting = require("../../models/TEAMLEADER/Meeting.js");
const MeetingAttendance = require("../../models/TEAMLEADER/Meeting.js");
const TeamLeaderEmployee = require("../../models/TEAMLEADER/TeamLeaderEmployee.js");
const SalesEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee.js"); // Fixed path
const ProjectManager = require("../../models/PROJECTMANAGER/ProjectManagerEmployee.js"); // Fixed path
const upload = require("../../config/multerConfig.js");

const router = express.Router();

// Get all meetings for team leader with filters
router.get("/", authenticateToken, async (req, res) => {
  try {
    const teamLeaderId = req.user.id;
    const { status, date, page = 1, limit = 10 } = req.query;
    
    let filter = { organizer: teamLeaderId };
    
    // Apply filters if provided
    if (status) filter.status = status;
    if (date) {
      filter['timeSlots.date'] = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    }
    
    const meetings = await Meeting.find(filter)
      .populate('participants.employeeId', 'name email phone designation')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Meeting.countDocuments(filter);

    res.json({
      success: true,
      data: meetings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMeetings: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
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

// Get meeting by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const teamLeaderId = req.user.id;

    const meeting = await Meeting.findOne({
      _id: id,
      organizer: teamLeaderId
    })
    .populate('participants.employeeId', 'name email phone designation')
    .populate('organizer', 'name email phone');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    res.json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting details",
      error: error.message,
    });
  }
});

// Create new meeting
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

    // Process participants with proper model references
    const processedParticipants = await Promise.all(
      participants.map(async (participant) => {
        let employeeModel = 'SalesEmployeeEmployee';
        
        // Check if employee exists in SalesEmployee collection
        const salesEmp = await SalesEmployee.findById(participant.employeeId);
        if (salesEmp) {
          employeeModel = 'SalesEmployeeEmployee';
        } else {
          // Check in ProjectManager collection
          const pmEmp = await ProjectManager.findById(participant.employeeId);
          if (pmEmp) {
            employeeModel = 'ProjectManagerEmployee';
          } else {
            throw new Error(`Employee with ID ${participant.employeeId} not found`);
          }
        }

        return {
          employeeId: participant.employeeId,
          employeeModel: employeeModel,
          name: participant.name,
          email: participant.email,
          status: 'pending'
        };
      })
    );

    // Process time slots
    const processedTimeSlots = timeSlots.map(slot => ({
      date: new Date(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime || calculateEndTime(slot.startTime),
      status: 'scheduled'
    }));

    // Create meeting
    const meeting = new Meeting({
      title,
      description: description || '',
      googleMeetLink,
      organizer: teamLeaderId,
      participants: processedParticipants,
      timeSlots: processedTimeSlots,
      agenda: agenda || '',
      meetingType: meetingType || 'team',
      priority: priority || 'medium',
      status: 'scheduled'
    });

    const savedMeeting = await meeting.save();

    // Populate the response
    await savedMeeting.populate('participants.employeeId', 'name email phone designation');
    await savedMeeting.populate('organizer', 'name email phone');

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

// Update meeting
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const teamLeaderId = req.user.id;
    const updateData = req.body;

    const meeting = await Meeting.findOne({
      _id: id,
      organizer: teamLeaderId
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Update meeting fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'organizer' && key !== 'createdAt') {
        meeting[key] = updateData[key];
      }
    });

    meeting.updatedAt = new Date();
    const updatedMeeting = await meeting.save();

    await updatedMeeting.populate('participants.employeeId', 'name email phone designation');
    await updatedMeeting.populate('organizer', 'name email phone');

    res.json({
      success: true,
      message: "Meeting updated successfully",
      data: updatedMeeting,
    });
  } catch (error) {
    console.error("Error updating meeting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meeting",
      error: error.message,
    });
  }
});

// Delete meeting
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const teamLeaderId = req.user.id;

    const meeting = await Meeting.findOneAndDelete({
      _id: id,
      organizer: teamLeaderId
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Also delete related attendance records
    await MeetingAttendance.deleteMany({ meeting: id });

    res.json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete meeting",
      error: error.message,
    });
  }
});

// Upload meeting documents
router.post("/:id/upload-document", authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const teamLeaderId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const meeting = await Meeting.findOne({
      _id: id,
      organizer: teamLeaderId
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const document = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: teamLeaderId
    };

    meeting.documents.push(document);
    await meeting.save();

    res.json({
      success: true,
      message: "Document uploaded successfully",
      data: document,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error.message,
    });
  }
});

// Upload screenshot
router.post("/:id/upload-screenshot", authenticateToken, upload.single('screenshot'), async (req, res) => {
  try {
    const { id } = req.params;
    const teamLeaderId = req.user.id;
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const meeting = await Meeting.findOne({
      _id: id,
      organizer: teamLeaderId
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const screenshot = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      caption: caption || ''
    };

    meeting.screenshots.push(screenshot);
    await meeting.save();

    res.json({
      success: true,
      message: "Screenshot uploaded successfully",
      data: screenshot,
    });
  } catch (error) {
    console.error("Error uploading screenshot:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload screenshot",
      error: error.message,
    });
  }
});

// Upload daily report
router.post("/:id/upload-report", authenticateToken, upload.single('report'), async (req, res) => {
  try {
    const { id } = req.params;
    const teamLeaderId = req.user.id;
    const { summary, reportDate } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const meeting = await Meeting.findOne({
      _id: id,
      organizer: teamLeaderId
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const report = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      reportDate: reportDate ? new Date(reportDate) : new Date(),
      summary: summary || ''
    };

    meeting.dailyReports.push(report);
    await meeting.save();

    res.json({
      success: true,
      message: "Daily report uploaded successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error uploading report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload report",
      error: error.message,
    });
  }
});

// Get meeting calendar events
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
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
    .populate('participants.employeeId', 'name email')
    .select('title timeSlots participants meetingType status googleMeetLink');

    // Format for calendar
    const calendarEvents = meetings.flatMap(meeting => 
      meeting.timeSlots.map(slot => ({
        id: `${meeting._id}-${slot._id}`,
        title: meeting.title,
        start: new Date(`${slot.date.toISOString().split('T')[0]}T${slot.startTime}`),
        end: new Date(`${slot.date.toISOString().split('T')[0]}T${slot.endTime}`),
        type: meeting.meetingType,
        status: meeting.status,
        participants: meeting.participants.length,
        meetingLink: meeting.googleMeetLink,
        extendedProps: {
          meetingId: meeting._id,
          description: meeting.description,
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

// Get meeting statistics
router.get("/stats/overview", authenticateToken, async (req, res) => {
  try {
    const teamLeaderId = req.user.id;

    const stats = await Meeting.aggregate([
      { $match: { organizer: new mongoose.Types.ObjectId(teamLeaderId) } },
      {
        $facet: {
          totalMeetings: [
            { $count: "count" }
          ],
          meetingsByStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          meetingsByType: [
            { $group: { _id: "$meetingType", count: { $sum: 1 } } }
          ],
          upcomingMeetings: [
            { 
              $match: { 
                'timeSlots.date': { $gte: new Date() },
                status: 'scheduled'
              } 
            },
            { $count: "count" }
          ],
          monthlyTrend: [
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 6 }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    console.error("Error fetching meeting stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting statistics",
      error: error.message,
    });
  }
});

// Get available employees for meetings
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
        ...emp,
        employeeModel: 'SalesEmployeeEmployee'
      })),
      ...projectManagers.map(emp => ({
        ...emp,
        employeeModel: 'ProjectManagerEmployee'
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

// Helper function to calculate end time
function calculateEndTime(startTime, duration = 60) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate.getTime() + duration * 60000);
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}

module.exports = router;