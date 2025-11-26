const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/Holiday");
const { SalesEmployeeAuth } = require("../../middleware/authMiddleware");

// Check if specific date is holiday for sales employee
router.get("/check/:date", SalesEmployeeAuth, async (req, res) => {
  try {
    const { date } = req.params;

    console.log(`🔍 Checking holiday for date: ${date}`);

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Check for holidays in sales-employee department
    const holiday = await Holiday.findOne({
      date: date,
      departments: "sales-employee",
    });

    console.log(`📅 Holiday check result: ${holiday ? "Found" : "Not found"}`);

    res.json({
      success: true,
      exists: !!holiday,
      data: holiday,
    });
  } catch (err) {
    console.error("❌ Error checking holiday:", err);
    res.status(500).json({
      success: false,
      error: "Failed to check holiday status",
    });
  }
});

// Get holidays for date range for sales employee
router.get("/range", SalesEmployeeAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "Start date and end date are required",
      });
    }

    console.log(`📅 Fetching holidays from ${startDate} to ${endDate}`);

    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate },
      departments: "sales-employee",
    }).sort({ date: 1 });

    console.log(`✅ Found ${holidays.length} holidays`);

    res.json({
      success: true,
      data: holidays,
      count: holidays.length,
    });
  } catch (err) {
    console.error("❌ Error fetching holidays:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch holidays",
    });
  }
});

// Get today's holiday status for sales employee
router.get("/today", SalesEmployeeAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    console.log(`📅 Checking today's holiday (${today})`);

    const holiday = await Holiday.findOne({
      date: today,
      departments: "sales-employee",
    });

    res.json({
      success: true,
      isHoliday: !!holiday,
      data: holiday,
    });
  } catch (err) {
    console.error("❌ Error checking today's holiday:", err);
    res.status(500).json({
      success: false,
      error: "Failed to check today's holiday status",
    });
  }
});

module.exports = router;