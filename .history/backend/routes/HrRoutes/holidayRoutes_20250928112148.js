// backend/routes/HR/holidayRoutes.js
const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/Holiday");

// ✅ Create a new holiday for multiple departments
router.post("/create", async (req, res) => {
  try {
    const {
      date,
      title,
      description,
      departments, // Array of department objects: [{deptId: "DEPT_001", name: "TeleCaller"}, ...]
      status,
      startTime,
      endTime,
      createdBy
    } = req.body;

    // Validate departments array
    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one department is required"
      });
    }

    // Check if holiday already exists for this date with same department combination
    const departmentIds = departments.map(dept => dept.deptId).sort();
    const existingHoliday = await Holiday.findOne({ 
      date,
      "departments.deptId": { $all: departmentIds }
    });

    if (existingHoliday) {
      return res.status(400).json({
        success: false,
        error: "Holiday already exists for this date with the same departments"
      });
    }

    const newHoliday = new Holiday({
      date,
      title,
      description,
      departments,
      status,
      startTime,
      endTime,
      displayTime: getDisplayTime(status, startTime, endTime),
      backgroundColor: getEventColor(status),
      createdBy
    });

    await newHoliday.save();
    
    res.status(201).json({
      success: true,
      message: "Holiday created successfully for selected departments",
      data: newHoliday
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get all holidays with filtering
router.get("/fetch", async (req, res) => {
  try {
    const { department, month, year, status, deptId } = req.query;
    
    let filter = {};
    
    if (deptId) {
      filter["departments.deptId"] = deptId;
    } else if (department && department !== "All") {
      filter["departments.name"] = department;
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

// Helper functions
const getDisplayTime = (status, startTime, endTime) => {
  if (status === "Full Day Holiday") return "All Day";
  
  const formatTime = (time24h) => {
    const [hour, minute] = time24h.split(':');
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    return `${displayHour}:${minute} ${period}`;
  };
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

const getEventColor = (status) => {
  const colors = {
    "Full Day Holiday": "red",
    "Half Day Holiday": "orange", 
    "Working Day": "green"
  };
  return colors[status] || "gray";
};

// ... keep other routes the same but update department references