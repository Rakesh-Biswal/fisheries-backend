const express = require("express");
const router = express.Router();
const Attendance = require("../../models/ATTENDANCE/Attendance");

// Middleware to verify sales employee
const SalesEmployeeAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const SalesEmployeeEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee");
    const employee = await SalesEmployeeEmployee.findById(decoded.id);

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    req.employee = {
      id: employee._id,
      name: employee.name,
      email: employee.companyEmail,
      role: employee.role,
    };

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Get active session with timeout handling
router.get("/active-session", SalesEmployeeAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employeeId: req.employee.id,
      employeeModel: "SalesEmployeeEmployee",
      date: today,
      workModeOffTime: null, // Only active sessions
    });

    if (!attendance) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const responseData = {
      isActive: true,
      workModeOnTime: attendance.workModeOnTime,
      totalDistanceTravelled: attendance.totalDistanceTravelled,
      status: attendance.status,
      workType: attendance.workType,
      startingLocation: attendance.workModeOnCoordinates,
      currentLocation:
        attendance.travelLogs.length > 0
          ? attendance.travelLogs[attendance.travelLogs.length - 1].coordinates
          : attendance.workModeOnCoordinates,
    };

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching active session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active session",
    });
  }
});

// Start work mode with improved error handling
router.post("/work-mode-on", SalesEmployeeAuth, async (req, res) => {
  try {
    const {
      coordinates,
      workType = "Field Work",
      imageURL,
      existingDistance = 0,
      isResuming = false,
    } = req.body;

    console.log("Sales Employee Work mode on request:", {
      employee: req.employee.id,
      coordinates,
      workType,
      hasImage: !!imageURL,
      existingDistance,
      isResuming,
    });

    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return res.status(400).json({
        success: false,
        message: "Location coordinates are required",
      });
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // FIRST: Check for existing ACTIVE session
    const existingActiveAttendance = await Attendance.findOne({
      employeeId: req.employee.id,
      employeeModel: "SalesEmployeeEmployee",
      date: today,
      workModeOffTime: null, // Only check active sessions
    });

    if (existingActiveAttendance) {
      console.log("🔄 Active session found, updating existing record");

      // Update the existing active attendance
      existingActiveAttendance.workModeOnCoordinates = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      // Save image URL if provided
      if (imageURL) {
        existingActiveAttendance.ImageURL = imageURL;
        console.log("📸 Image URL saved to active session:", imageURL);
      }

      // Add resume log
      existingActiveAttendance.travelLogs.push({
        timestamp: new Date(),
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        distanceFromStart: existingDistance,
        type: "resume_active",
      });

      await existingActiveAttendance.save();

      const responseData = {
        isActive: true,
        workModeOnTime: existingActiveAttendance.workModeOnTime,
        totalWorkDuration: null,
        totalDistanceTravelled:
          existingActiveAttendance.totalDistanceTravelled + existingDistance,
        status: existingActiveAttendance.status,
        workType: existingActiveAttendance.workType,
        startingLocation: existingActiveAttendance.workModeOnCoordinates,
        imageURL: existingActiveAttendance.ImageURL,
      };

      return res.json({
        success: true,
        message: "Active work session resumed successfully",
        data: responseData,
      });
    }

    // SECOND: Check for COMPLETED session today that we can EXTEND
    const todaysCompletedSession = await Attendance.findOne({
      employeeId: req.employee.id,
      employeeModel: "SalesEmployeeEmployee",
      date: today,
      workModeOffTime: { $ne: null }, // Completed sessions
    }).sort({ workModeOnTime: -1 }); // Get the latest one

    if (todaysCompletedSession) {
      console.log("📅 Found completed session for today, extending it");

      // Re-open the completed session
      todaysCompletedSession.workModeOffTime = null;
      todaysCompletedSession.status = "Active";

      // Update coordinates
      todaysCompletedSession.workModeOnCoordinates = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      // Save image URL if provided
      if (imageURL) {
        todaysCompletedSession.ImageURL = imageURL;
        console.log("📸 Image URL saved to extended session:", imageURL);
      }

      // Add extend entry to travel logs
      todaysCompletedSession.travelLogs.push({
        timestamp: new Date(),
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        distanceFromStart:
          todaysCompletedSession.totalDistanceTravelled + existingDistance,
        type: "extend",
      });

      // Update total distance
      todaysCompletedSession.totalDistanceTravelled += existingDistance;

      await todaysCompletedSession.save();

      const responseData = {
        isActive: true,
        workModeOnTime: todaysCompletedSession.workModeOnTime,
        totalWorkDuration: null, // Will be recalculated when ended
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

    // THIRD: Create brand new attendance (no existing session found)
    console.log("🆕 Creating brand new attendance record");

    const attendanceData = {
      employeeId: req.employee.id,
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
      name: req.employee.name,
      totalDistanceTravelled: existingDistance,
      ImageURL: imageURL || null,
      travelLogs: [
        {
          timestamp: new Date(),
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          },
          distanceFromStart: existingDistance,
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

    // Handle specific MongoDB errors
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

// End work mode with improved data handling
router.post("/work-mode-off", SalesEmployeeAuth, async (req, res) => {
  try {
    const { coordinates, totalDistance } = req.body;

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's active attendance record
    const attendance = await Attendance.findOne({
      employeeId: req.employee.id,
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

    // Set work mode off time
    const workModeOffTime = new Date();
    attendance.workModeOffTime = workModeOffTime;

    // Add final coordinates if provided
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      attendance.workModeOffCoordinates = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      // Add final travel log
      attendance.travelLogs.push({
        timestamp: workModeOffTime,
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        distanceFromStart: totalDistance || attendance.totalDistanceTravelled,
      });
    }

    // Update total distance if provided
    if (totalDistance !== undefined && totalDistance !== null) {
      attendance.totalDistanceTravelled = parseFloat(totalDistance);
    }

    // Calculate total work duration in hours
    const workModeOnTime = new Date(attendance.workModeOnTime);
    const durationMs = workModeOffTime - workModeOnTime;
    const durationHours = durationMs / (1000 * 60 * 60);
    attendance.totalWorkDuration = parseFloat(durationHours.toFixed(2));

    // Determine final status based on work duration
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

// Get today's attendance status
router.get("/today", SalesEmployeeAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employeeId: req.employee.id,
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

module.exports = router;
