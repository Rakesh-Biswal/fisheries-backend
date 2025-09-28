// backend/routes/HR/holidayRoutes.js
const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/Holiday");

// ✅ Create a new holiday


// ✅ Get all holidays with filtering
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

// ✅ Update a holiday
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { departments, ...updateData } = req.body;

    console.log("Updating holiday with departments:", departments); // Debug log

    // Validate departments array if provided
    if (departments) {
      if (!Array.isArray(departments) || departments.length === 0) {
        return res.status(400).json({
          success: false,
          error: "At least one department must be selected"
        });
      }

      // Check if departments array contains valid values
      const validDepartments = ["Accountant", "HR", "ProjectManager", "TeamLeader", "SalesEmployee", "Telecaller"];
      const invalidDepartments = departments.filter(dept => !validDepartments.includes(dept));
      
      if (invalidDepartments.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid departments selected: ${invalidDepartments.join(", ")}`
        });
      }

      const sortedDepartments = [...departments].sort();
      
      // If departments are being updated, check for conflicts
      const existingHoliday = await Holiday.findOne({
        _id: { $ne: id },
        date: req.body.date || (await Holiday.findById(id)).date,
        departments: { $size: sortedDepartments.length, $all: sortedDepartments }
      });
      
      if (existingHoliday) {
        return res.status(400).json({
          success: false,
          error: "Holiday already exists for this date with the selected departments"
        });
      }

      updateData.departments = sortedDepartments;
    }

    const updatedHoliday = await Holiday.findByIdAndUpdate(
      id,
      updateData,
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
    console.error("Error updating holiday:", err); // Debug log
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