// backend/routes/HR/holidayRoutes.js
const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/Holiday");

// ✅ Create a new holiday (FIXED version)
router.post("/create", async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      departments,
      status,
      startTime,
      endTime,
      displayTime,
      backgroundColor
    } = req.body;

    if (!Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ success: false, error: "Departments required" });
    }

    const newEvent = new AttendanceCalendar({
      title,
      description,
      date,
      departments, // ✅ directly save as array
      status,
      startTime,
      endTime,
      displayTime,
      backgroundColor
    });

    await newEvent.save();

    res.json({ success: true, data: newEvent });
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


// Helper function to get default color based on status
function getDefaultColor(status) {
  const colors = {
    "Full Day Holiday": "red",
    "Half Day Holiday": "orange", 
    "Working Day": "green"
  };
  return colors[status] || "gray";
}

// ✅ Get all holidays (FIXED version)
router.get("/fetch", async (req, res) => {
  try {
    console.log('Received fetch request with query:', req.query); // Debug log
    
    const { department, month, year, status } = req.query;
    
    let filter = {};
    
    // Handle department filter - check if any holiday contains the specified department
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
    
    console.log('Found holidays:', holidays.length); // Debug log
    
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
    console.log('Received update request for ID:', id, 'with data:', req.body); // Debug log
    
    // Validate departments if provided
    if (req.body.departments) {
      if (!Array.isArray(req.body.departments)) {
        if (typeof req.body.departments === 'string') {
          try {
            req.body.departments = JSON.parse(req.body.departments);
          } catch (parseError) {
            return res.status(400).json({
              success: false,
              error: "Departments must be a valid array"
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            error: "Departments must be an array"
          });
        }
      }
      
      if (req.body.departments.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Departments array cannot be empty"
        });
      }
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
    
    console.log('Holiday updated successfully:', updatedHoliday); // Debug log
    
    res.json({
      success: true,
      message: "Holiday updated successfully",
      data: updatedHoliday
    });
  } catch (err) {
    console.error("Error updating holiday:", err);
    
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Holiday already exists for this date and department combination"
      });
    }
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({
        success: false,
        error: `Validation error: ${errors.join(', ')}`
      });
    }
    
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
    console.log('Received delete request for ID:', id); // Debug log
    
    const deletedHoliday = await Holiday.findByIdAndDelete(id);
    
    if (!deletedHoliday) {
      return res.status(404).json({
        success: false,
        error: "Holiday not found"
      });
    }
    
    console.log('Holiday deleted successfully:', deletedHoliday); // Debug log
    
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

module.exports = router;