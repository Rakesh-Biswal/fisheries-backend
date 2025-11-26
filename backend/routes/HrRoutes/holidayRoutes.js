// backend/routes/HR/holidayRoutes.js
const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/Holiday");
const authenticateToken = require("../HrRoutes/HrAuthMiddlewear");


// ✅ Create a new holiday with multiple departments - FIXED DATE HANDLING
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const {
      date,
      title,
      description,
      departments,
      status,
      startTime,
      endTime,
      displayTime,
      departmentColors,
      backgroundColor
    } = req.body;

    console.log("Received data:", req.body); // Debug log

    // ✅ FIX: Validate date format and ensure it's stored correctly
    if (!date || !title || !departments || !status) {
      return res.status(400).json({
        success: false,
        error: "Date, title, departments, and status are required fields"
      });
    }

    // ✅ FIX: Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Please use YYYY-MM-DD format"
      });
    }

    // Validate departments array
    if (!Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one department must be selected"
      });
    }

    // Validate department values against enum - WITH DETAILED ERROR
    const validDepartments = ['hr', 'team-leader', 'project-manager', 'sales-employee', 'telecaller', 'accountant', 'ceo'];
    const invalidDepartments = departments.filter(dept => !validDepartments.includes(dept));

    if (invalidDepartments.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid departments: ${invalidDepartments.join(", ")}. Valid departments are: ${validDepartments.join(", ")}`
      });
    }

    // ✅ FIX: Check if holiday already exists for this exact date and any of the selected departments
    const existingHolidays = await Holiday.find({
      date: date, // Use exact date string comparison
      departments: { $in: departments }
    });

    if (existingHolidays.length > 0) {
      const conflictingDepts = [];
      existingHolidays.forEach(holiday => {
        holiday.departments.forEach(dept => {
          if (departments.includes(dept) && !conflictingDepts.includes(dept)) {
            conflictingDepts.push(dept);
          }
        });
      });

      return res.status(400).json({
        success: false,
        error: `Holiday already exists for date ${date} in departments: ${conflictingDepts.join(", ")}`
      });
    }

    const newHoliday = new Holiday({
      date: date, // Store as exact string
      title,
      description: description || "",
      departments,
      status,
      startTime: startTime || "09:00",
      endTime: endTime || "17:00",
      displayTime: displayTime || "",
      departmentColors: departmentColors || [],
      backgroundColor: backgroundColor || "",
      createdBy: req.user._id
    });

    await newHoliday.save();

    console.log("Holiday created successfully for date:", date); // Debug log

    res.status(201).json({
      success: true,
      message: "Holiday created successfully for selected departments",
      data: newHoliday
    });
  } catch (err) {
    console.error("Error creating holiday:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Holiday already exists for this date and departments combination"
      });
    }

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get all holidays with filtering - FIXED DATE HANDLING
router.get("/fetch", authenticateToken, async (req, res) => {
  try {
    const { department, year, status, search } = req.query;

    let filter = {};

    // Department filter
    if (department && department !== "all") {
      filter.departments = department;
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // ✅ FIX: Year filter - use string comparison for exact match
    if (year) {
      filter.date = { $regex: `^${year}` };
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const holidays = await Holiday.find(filter)
      .populate("createdBy", "name email")
      .sort({ date: 1 });

    console.log("Fetched holidays count:", holidays.length); // Debug log

    res.json({
      success: true,
      data: holidays,
      count: holidays.length
    });
  } catch (err) {
    console.error("Error fetching holidays:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Update a holiday - FIXED DATE HANDLING
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      departments,
      date,
      ...updateData
    } = req.body;

    // Find existing holiday
    const existingHoliday = await Holiday.findById(id);
    if (!existingHoliday) {
      return res.status(404).json({
        success: false,
        error: "Holiday not found"
      });
    }

    // ✅ FIX: Validate date format if provided
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          error: "Invalid date format. Please use YYYY-MM-DD format"
        });
      }
    }

    // Validate departments array if provided
    if (departments && (!Array.isArray(departments) || departments.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "At least one department must be selected"
      });
    }

    // Check for conflicts with other holidays if departments or date are being updated
    const checkDate = date || existingHoliday.date;
    const checkDepartments = departments || existingHoliday.departments;

    if (date || departments) {
      const conflictingHoliday = await Holiday.findOne({
        _id: { $ne: id },
        date: checkDate, // Exact string comparison
        departments: { $in: checkDepartments }
      });

      if (conflictingHoliday) {
        const conflictingDepts = conflictingHoliday.departments.filter(dept =>
          checkDepartments.includes(dept)
        );
        return res.status(400).json({
          success: false,
          error: `Holiday conflict for date ${checkDate} in departments: ${conflictingDepts.join(", ")}`
        });
      }
    }

    // Update the holiday
    const updatedHoliday = await Holiday.findByIdAndUpdate(
      id,
      {
        ...updateData,
        ...(departments && { departments }),
        ...(date && { date }),
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    console.log("Holiday updated for date:", date || existingHoliday.date); // Debug log

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
        error: "Holiday conflict with existing records"
      });
    }

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ... (keep all other backend routes the same as in your original code)

module.exports = router;





// ✅ Delete a holiday
router.delete("/:id", authenticateToken, async (req, res) => {
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
      message: "Holiday deleted successfully",
      data: deletedHoliday
    });
  } catch (err) {
    console.error("Error deleting holiday:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get holiday by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findById(id).populate("createdBy", "name email");

    if (!holiday) {
      return res.status(404).json({
        success: false,
        error: "Holiday not found"
      });
    }

    res.json({
      success: true,
      data: holiday
    });
  } catch (err) {
    console.error("Error fetching holiday:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Check holiday for specific date and department
router.get("/check/:date", authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const { department } = req.query;

    let filter = { date };

    if (department && department !== "all") {
      filter.departments = department;
    }

    const holidays = await Holiday.find(filter);

    res.json({
      success: true,
      exists: holidays.length > 0,
      data: holidays,
      count: holidays.length
    });
  } catch (err) {
    console.error("Error checking holiday:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get holidays by department
router.get("/department/:department", authenticateToken, async (req, res) => {
  try {
    const { department } = req.params;
    const { year } = req.query;

    // Validate department
    const validDepartments = ['HR', 'Development', 'Design', 'Marketing', 'Sales', 'Support', 'Management', 'Accountant', 'Project Manager', 'Team Leader', 'Telecaller', 'Sales Employee'];
    if (!validDepartments.includes(department)) {
      return res.status(400).json({
        success: false,
        error: "Invalid department"
      });
    }

    let filter = {
      departments: department
    };

    if (year) {
      filter.date = { $regex: `^${year}` };
    }

    const holidays = await Holiday.find(filter)
      .populate("createdBy", "name email")
      .sort({ date: 1 });

    res.json({
      success: true,
      data: holidays,
      count: holidays.length
    });
  } catch (err) {
    console.error("Error fetching department holidays:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Get holidays for date range
router.get("/range/:startDate/:endDate", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const { department } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "Start date and end date are required"
      });
    }

    let filter = {
      date: { $gte: startDate, $lte: endDate }
    };

    if (department && department !== "all") {
      filter.departments = department;
    }

    const holidays = await Holiday.find(filter)
      .populate("createdBy", "name email")
      .sort({ date: 1 });

    res.json({
      success: true,
      data: holidays,
      count: holidays.length
    });
  } catch (err) {
    console.error("Error fetching holiday range:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;