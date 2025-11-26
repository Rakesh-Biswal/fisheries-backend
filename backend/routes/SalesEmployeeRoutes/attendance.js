const express = require("express");
const router = express.Router();
const Attendance = require("../../models/ATTENDANCE/Attendance");
const { SalesEmployeeAuth } = require("../../middleware/authMiddleware");

// Get today's attendance status
router.get("/today", SalesEmployeeAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employeeId: req.salesEmployee.id,
      employeeModel: "SalesEmployeeEmployee",
      date: today,
    });

    if (!attendance) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const responseData = {
      isActive: !attendance.workModeOffTime,
      workModeOnTime: attendance.workModeOnTime,
      workModeOffTime: attendance.workModeOffTime,
      totalWorkDuration: attendance.totalWorkDuration,
      totalDistanceTravelled: attendance.totalDistanceTravelled,
      status: attendance.status,
      workType: attendance.workType,
      startingLocation: attendance.workModeOnCoordinates,
      endLocation: attendance.workModeOffCoordinates,
      travelLogs: attendance.travelLogs,
    };

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error checking today attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance data",
    });
  }
});

// Start work mode
router.post("/work-mode-on", SalesEmployeeAuth, async (req, res) => {
  try {
    const { coordinates, workType = "Field Work", imageURL } = req.body;

    console.log("Sales Employee Work mode on request:", {
      employee: req.salesEmployee.id,
      coordinates,
      workType,
      hasImage: !!imageURL,
    });

    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return res.status(400).json({
        success: false,
        message: "Location coordinates are required",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for existing active session
    const existingActiveAttendance = await Attendance.findOne({
      employeeId: req.salesEmployee.id,
      employeeModel: "SalesEmployeeEmployee",
      date: today,
      workModeOffTime: null,
    });

    if (existingActiveAttendance) {
      return res.status(400).json({
        success: false,
        message: "Work mode is already active for today",
      });
    }

    // Check for completed session today
    const todaysCompletedSession = await Attendance.findOne({
      employeeId: req.salesEmployee.id,
      employeeModel: "SalesEmployeeEmployee",
      date: today,
      workModeOffTime: { $ne: null },
    }).sort({ workModeOnTime: -1 });

    if (todaysCompletedSession) {
      // Extend the completed session
      todaysCompletedSession.workModeOffTime = null;
      todaysCompletedSession.status = "Active";

      todaysCompletedSession.workModeOnCoordinates = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      if (imageURL) {
        todaysCompletedSession.ImageURL = imageURL;
      }

      todaysCompletedSession.travelLogs.push({
        timestamp: new Date(),
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        distanceFromStart: todaysCompletedSession.totalDistanceTravelled,
        type: "extend",
      });

      await todaysCompletedSession.save();

      const responseData = {
        isActive: true,
        workModeOnTime: todaysCompletedSession.workModeOnTime,
        totalWorkDuration: null,
        totalDistanceTravelled: todaysCompletedSession.totalDistanceTravelled,
        status: todaysCompletedSession.status,
        workType: todaysCompletedSession.workType,
        startingLocation: todaysCompletedSession.workModeOnCoordinates,
        imageURL: todaysCompletedSession.ImageURL,
      };

      return res.json({
        success: true,
        message: "Work session extended successfully",
        data: responseData,
      });
    }

    // Create new attendance record
    const attendanceData = {
      employeeId: req.salesEmployee.id,
      employeeModel: "SalesEmployeeEmployee",
      department: "Field Executive",
      date: today,
      workModeOnTime: new Date(),
      workModeOnCoordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
      workType,
      status: "Active",
      name: req.salesEmployee.name,
      totalDistanceTravelled: 0,
      ImageURL: imageURL || null,
      travelLogs: [
        {
          timestamp: new Date(),
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          },
          distanceFromStart: 0,
          type: "start",
        },
      ],
    };

    const attendance = new Attendance(attendanceData);
    await attendance.save();

    console.log("✅ New attendance record created successfully");

    const responseData = {
      isActive: true,
      workModeOnTime: attendance.workModeOnTime,
      totalWorkDuration: null,
      totalDistanceTravelled: attendance.totalDistanceTravelled,
      status: attendance.status,
      workType: attendance.workType,
      startingLocation: attendance.workModeOnCoordinates,
      imageURL: attendance.ImageURL,
    };

    res.status(201).json({
      success: true,
      message: "Work mode started successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error starting work mode:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Attendance record already exists for today",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to start work mode",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// End work mode
router.post("/work-mode-off", SalesEmployeeAuth, async (req, res) => {
  try {
    const { coordinates, totalDistance } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employeeId: req.salesEmployee.id,
      employeeModel: "SalesEmployeeEmployee",
      date: today,
      workModeOffTime: null,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No active work session found",
      });
    }

    const workModeOffTime = new Date();
    attendance.workModeOffTime = workModeOffTime;

    if (coordinates && coordinates.latitude && coordinates.longitude) {
      attendance.workModeOffCoordinates = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      attendance.travelLogs.push({
        timestamp: workModeOffTime,
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        distanceFromStart: totalDistance || attendance.totalDistanceTravelled,
      });
    }

    if (totalDistance !== undefined && totalDistance !== null) {
      attendance.totalDistanceTravelled = parseFloat(totalDistance);
    }

    const workModeOnTime = new Date(attendance.workModeOnTime);
    const durationMs = workModeOffTime - workModeOnTime;
    const durationHours = durationMs / (1000 * 60 * 60);
    attendance.totalWorkDuration = parseFloat(durationHours.toFixed(2));

    if (durationHours >= 8) {
      attendance.status = "Present";
    } else if (durationHours >= 4) {
      attendance.status = "Half Day";
    } else if (durationHours < 4) {
      attendance.status = "Early Leave";
    } else {
      attendance.status = "Approved";
    }

    await attendance.save();

    const responseData = {
      isActive: false,
      workModeOnTime: attendance.workModeOnTime,
      workModeOffTime: attendance.workModeOffTime,
      totalWorkDuration: attendance.totalWorkDuration,
      totalDistanceTravelled: attendance.totalDistanceTravelled,
      status: attendance.status,
      workType: attendance.workType,
      startingLocation: attendance.workModeOnCoordinates,
      endLocation: attendance.workModeOffCoordinates,
    };

    res.json({
      success: true,
      message: "Work mode ended successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error ending work mode:", error);
    res.status(500).json({
      success: false,
      message: "Failed to end work mode",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
