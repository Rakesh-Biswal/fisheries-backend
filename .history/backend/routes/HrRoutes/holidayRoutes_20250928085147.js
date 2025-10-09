// backend/routes/HR/holidayRoutes.js
const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/Holiday");

// ✅ Create a new holiday
router.post("/create", async (req, res) => {
  try {
    const {
      date,
      title,
      description,
      department,
      status,
      startTime,
      endTime,
      type,
      isRecurring,
      createdBy
    } = req.body;

    // Check if holiday already exists for this date and department
    const existingHoliday = await Holiday.findOne({ date, department });
    if (existingHoliday) {
      return res.status(400).json({
        success: false,
        error: "Holiday already exists for this date and department"
      });
    }

    const newHoliday = new Holiday({
      date,
      title,
      description,
      department,
      status,
      startTime,
      endTime,
      type,
      isRecurring,
      createdBy
    });

    await newHoliday.save();
    
    res.status(201).json({
      success: true,
      message: "Holiday created successfully",
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

// ✅ Get holidays for a specific date range
router.get("/range", async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "Start date and end date are required"
      });
    }
    
    let filter = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (department && department !== "All") {
      filter.department = department;
    }
    
    const holidays = await Holiday.find(filter).sort({ date: 1 });
    
    res.json({
      success: true,
      data: holidays
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Update a holiday
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedHoliday = await Holiday.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedHoliday) {
      return res.status(404).json({
        success: false,
        error: "Holiday not found"
      });
    }
    
    res.json({
      success: true,
      message: "Holiday updated successfully",
      data: updatedHoliday
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Delete a holiday
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedHoliday = await Holiday.findByIdAndDelete(id);
    
    if (!deletedHoliday) {
      return res.status(404).json({
        success: false,
        error: "Holiday not found"
      });
    }
    
    res.json({
      success: true,
      message: "Holiday deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Check if date has holiday
router.get("/check/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const { department } = req.query;
    
    let filter = { date };
    
    if (department && department !== "All") {
      filter.department = { $in: [department, "All"] };
    }
    
    const holiday = await Holiday.findOne(filter);
    
    res.json({
      success: true,
      exists: !!holiday,
      data: holiday
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get holidays by department
router.get("/department/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const { year } = req.query;
    
    let filter = {
      department: { $in: [department, "All"] }
    };
    
    if (year) {
      filter.date = { $regex: `^${year}` };
    }
    
    const holidays = await Holiday.find(filter).sort({ date: 1 });
    
    res.json({
      success: true,
      data: holidays
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;