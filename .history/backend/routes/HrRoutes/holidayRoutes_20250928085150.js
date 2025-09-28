// backend/routes/HR/holidayRoutes.js
const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/Holiday");

// ✅ Create a new holiday (updated for departments array)
router.post("/create", async (req, res) => {
  try {
    const {
      date,
      title,
      description,
      departments, // Now an array
      status,
      startTime,
      endTime,
      displayTime,
      backgroundColor
    } = req.body;

    // Validate required fields
    if (!date || !title || !departments || !status) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: date, title, departments, status"
      });
    }

    // Validate departments is an array
    if (!Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Departments must be a non-empty array"
      });
    }

    // Check if holiday already exists for this date and department combination
    const existingHoliday = await Holiday.findOne({ 
      date, 
      departments: { $in: departments } 
    });
    
    if (existingHoliday) {
      return res.status(400).json({
        success: false,
        error: "Holiday already exists for this date and department combination"
      });
    }

    const newHoliday = new Holiday({
      date,
      title,
      description,
      departments,
      status,
      startTime: startTime || "09:00",
      endTime: endTime || "17:00",
      displayTime: displayTime || "",
      backgroundColor: backgroundColor || ""
    });

    await newHoliday.save();
    
    res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      data: newHoliday
    });
  } catch (err) {
    console.error("Error creating holiday:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get all holidays (fixed response structure)
router.get("/fetch", async (req, res) => {
  try {
    const { department, month, year, status } = req.query;
    
    let filter = {};
    
    if (department && department !== "All") {
      filter.departments = department;
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
    
    // Ensure we always return a data array
    res.json({
      success: true,
      data: holidays || [],
      count: holidays.length
    });
  } catch (err) {
    console.error("Error fetching holidays:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      data: [] // Always return empty array on error
    });
  }
});

// ✅ Update a holiday
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate departments if provided
    if (req.body.departments && (!Array.isArray(req.body.departments) || req.body.departments.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "Departments must be a non-empty array"
      });
    }

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
    console.error("Error updating holiday:", err);
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
    console.error("Error deleting holiday:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Check if date has holiday for specific departments
router.get("/check/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const { departments } = req.query;
    
    let filter = { date };
    
    if (departments) {
      const deptArray = Array.isArray(departments) ? departments : [departments];
      filter.departments = { $in: deptArray };
    }
    
    const holiday = await Holiday.findOne(filter);
    
    res.json({
      success: true,
      exists: !!holiday,
      data: holiday
    });
  } catch (err) {
    console.error("Error checking holiday:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;