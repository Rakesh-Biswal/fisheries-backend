// backend/routes/HR/holidayRoutes.js
const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/setholiday");

// ✅ Create a new holiday/event
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
      displayTime,
      departmentColor,
      backgroundColor,
      createdBy,
      isRecurring,
      recurringType
    } = req.body;

    // Check if holiday already exists for this date and department
    const existingHoliday = await Holiday.findOne({ date, department });
    if (existingHoliday) {
      return res.status(400).json({ 
        success: false, 
        error: "Holiday/Event already exists for this date and department" 
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
      displayTime,
      departmentColor,
      backgroundColor,
      createdBy,
      isRecurring,
      recurringType
    });

    await newHoliday.save();
    res.status(201).json({ 
      success: true, 
      message: "Holiday/Event created successfully",
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

// ✅ Get all holidays/events
router.get("/fetch", async (req, res) => {
  try {
    const { department, startDate, endDate } = req.query;
    
    let filter = {};
    if (department && department !== "All") {
      filter.department = department;
    }
    
    if (startDate && endDate) {
      filter.date = { 
        $gte: startDate, 
        $lte: endDate 
      };
    }

    const holidays = await Holiday.find(filter).sort({ date: 1 });
    
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

// ✅ Get holidays by date range
router.get("/fetch-by-range", async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: "Start date and end date are required" 
      });
    }

    let filter = { 
      date: { 
        $gte: startDate, 
        $lte: endDate 
      } 
    };

    if (department && department !== "All") {
      filter.department = department;
    }

    const holidays = await Holiday.find(filter).sort({ date: 1 });
    
    res.json({ 
      success: true, 
      data: holidays,
      count: holidays.length 
    });
  } catch (err) {
    console.error("Error fetching holidays by range:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ✅ Get holiday by ID
router.get("/:id", async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ 
        success: false, 
        error: "Holiday/Event not found" 
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

// ✅ Update a holiday/event
router.put("/:id", async (req, res) => {
  try {
    const {
      title,
      description,
      department,
      status,
      startTime,
      endTime,
      displayTime,
      departmentColor,
      backgroundColor
    } = req.body;

    const updatedHoliday = await Holiday.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        department,
        status,
        startTime,
        endTime,
        displayTime,
        departmentColor,
        backgroundColor
      },
      { new: true, runValidators: true }
    );

    if (!updatedHoliday) {
      return res.status(404).json({ 
        success: false, 
        error: "Holiday/Event not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Holiday/Event updated successfully",
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

// ✅ Delete a holiday/event
router.delete("/:id", async (req, res) => {
  try {
    const deletedHoliday = await Holiday.findByIdAndDelete(req.params.id);
    if (!deletedHoliday) {
      return res.status(404).json({ 
        success: false, 
        error: "Holiday/Event not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Holiday/Event deleted successfully" 
    });
  } catch (err) {
    console.error("Error deleting holiday:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ✅ Delete holiday by date and department
router.delete("/", async (req, res) => {
  try {
    const { date, department } = req.body;
    
    if (!date || !department) {
      return res.status(400).json({ 
        success: false, 
        error: "Date and department are required" 
      });
    }

    const deletedHoliday = await Holiday.findOneAndDelete({ date, department });
    if (!deletedHoliday) {
      return res.status(404).json({ 
        success: false, 
        error: "Holiday/Event not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Holiday/Event deleted successfully" 
    });
  } catch (err) {
    console.error("Error deleting holiday:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ✅ Get department statistics
router.get("/stats/department", async (req, res) => {
  try {
    const stats = await Holiday.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          holidays: {
            $push: {
              date: "$date",
              title: "$title",
              status: "$status"
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (err) {
    console.error("Error fetching department stats:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

module.exports = router;