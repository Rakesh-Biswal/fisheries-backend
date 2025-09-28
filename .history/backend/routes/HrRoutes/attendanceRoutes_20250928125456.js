// backend/routes/HR/attendanceRoutes.js
const express = require("express");
const router = express.Router();
const Attendance = require("../../models/HR/Attendance");
const Holiday = require("../../models/HR/Holiday");

// ✅ Mark attendance
router.post("/mark", async (req, res) => {
  try {
    const {
      employeeId,
      date,
      department,
      status,
      checkIn,
      checkOut,
      notes
    } = req.body;

    // Check if attendance already marked for this date
    const existingAttendance = await Attendance.findOne({ employeeId, date });
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: "Attendance already marked for this date"
      });
    }

    // Check if it's a holiday
    const holiday = await Holiday.findOne({
      date,
      department: { $in: [department, "All"] }
    });

    const newAttendance = new Attendance({
      employeeId,
      date,
      department,
      status: holiday ? "Holiday" : status,
      checkIn,
      checkOut,
      notes,
      isHoliday: !!holiday,
      holidayType: holiday ? holiday.status : null
    });

    // Calculate total hours if checkIn and checkOut are provided
    if (checkIn && checkOut) {
      const [inHour, inMin] = checkIn.split(':').map(Number);
      const [outHour, outMin] = checkOut.split(':').map(Number);
      
      const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
      newAttendance.totalHours = totalMinutes / 60;
    }

    await newAttendance.save();
    
    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: newAttendance
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get attendance for employee
router.get("/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;
    
    let filter = { employeeId };
    
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    const attendance = await Attendance.find(filter).sort({ date: -1 });
    
    res.json({
      success: true,
      data: attendance,
      count: attendance.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get department attendance
router.get("/department/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const { date } = req.query;
    
    let filter = { department };
    
    if (date) {
      filter.date = date;
    }
    
    const attendance = await Attendance.find(filter)
      .populate("employeeId", "name email position")
      .sort({ date: -1 });
    
    res.json({
      success: true,
      data: attendance
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Update attendance
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedAttendance) {
      return res.status(404).json({
        success: false,
        error: "Attendance record not found"
      });
    }
    
    res.json({
      success: true,
      message: "Attendance updated successfully",
      data: updatedAttendance
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


router.get("/fetch", async (req, res) => {
  try {
    const { department, month, year, status } = req.query;
    
    let filter = {};
    
    if (department && department !== "All") {
      filter.department = department;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    const holidays = await Holiday.find(filter).sort({ date: 1 });
    
    res.json({
      success: true,
      data: holidays,
      count: holidays.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


// ✅ Get attendance summary
router.get("/summary/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;
    
    const attendance = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    const summary = {
      totalDays: attendance.length,
      present: attendance.filter(a => a.status === "Present").length,
      absent: attendance.filter(a => a.status === "Absent").length,
      halfDays: attendance.filter(a => a.status === "Half Day").length,
      leaves: attendance.filter(a => a.status === "Leave").length,
      holidays: attendance.filter(a => a.status === "Holiday").length,
      totalWorkingHours: attendance.reduce((sum, a) => sum + (a.totalHours || 0), 0)
    };
    
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;