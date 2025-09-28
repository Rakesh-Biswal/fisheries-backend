

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