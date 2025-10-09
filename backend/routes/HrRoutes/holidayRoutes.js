// backend/routes/HR/holidayRoutes.js
const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/Holiday");

// ✅ Create a new holiday with multiple departments
router.post("/create", async (req, res) => {
  try {
    const {
      date,
      title,
      description,
      departments, // Now accepts array of departments
      status,
      startTime,
      endTime,
      displayTime,
      departmentColors,
      backgroundColor,
      createdBy
    } = req.body;

    // Validate departments array
    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one department must be selected"
      });
    }

    // Check if holiday already exists for this date and any of the selected departments
    const existingHoliday = await Holiday.findOne({
      date,
      departments: { $in: departments }
    });
    
    if (existingHoliday) {
      const conflictingDepts = existingHoliday.departments.filter(dept => 
        departments.includes(dept)
      );
      return res.status(400).json({
        success: false,
        error: `Holiday already exists for this date in departments: ${conflictingDepts.join(", ")}`
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
      displayTime,
      departmentColors,
      backgroundColor,
      createdBy
    });

    await newHoliday.save();
    
    res.status(201).json({
      success: true,
      message: "Holiday created successfully for multiple departments",
      data: newHoliday
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get all holidays with filtering (updated for multiple departments)
router.get("/fetch", async (req, res) => {
  try {
    const { department, month, year, status } = req.query;
    
    let filter = {};
    
    if (department && department !== "All") {
      filter.departments = department; // This will find holidays where departments array contains the specified department
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

// ✅ Update a holiday with multiple departments
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { departments, ...updateData } = req.body;

    // Validate departments array if provided
    if (departments && (!Array.isArray(departments) || departments.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "At least one department must be selected"
      });
    }

    // Check for conflicts with other holidays if departments are being updated
    if (departments) {
      const existingHoliday = await Holiday.findOne({
        _id: { $ne: id }, // Exclude current holiday
        date: updateData.date || (await Holiday.findById(id)).date,
        departments: { $in: departments }
      });
      
      if (existingHoliday) {
        const conflictingDepts = existingHoliday.departments.filter(dept => 
          departments.includes(dept)
        );
        return res.status(400).json({
          success: false,
          error: `Holiday conflict for departments: ${conflictingDepts.join(", ")}`
        });
      }
    }

    const updatedHoliday = await Holiday.findByIdAndUpdate(
      id,
      { ...updateData, ...(departments && { departments }) },
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
      filter.departments = department;
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

// ✅ Check if date has holiday for specific department
router.get("/check/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const { department } = req.query;
    
    let filter = { date };
    
    if (department && department !== "All") {
      filter.departments = department;
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
      departments: department
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