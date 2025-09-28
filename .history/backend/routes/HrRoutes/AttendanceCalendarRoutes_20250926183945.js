const express = require("express");
const router = express.Router();
const Holiday = require("../../models/HR/setholiday");

// ✅ Create a new holiday/event
router.post("/create", async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      department,
      status,
      startTime,
      endTime,
      displayTime,
      departmentColor,
      backgroundColor
    } = req.body;

    // Check if event already exists for this date and department
    const existingEvent = await Holiday.findOne({ date, department });
    if (existingEvent) {
      return res.status(400).json({
        success: false,
        error: "Event already exists for this date and department"
      });
    }

    const newHoliday = new Holiday({
      title,
      description,
      date,
      department,
      status,
      startTime,
      endTime,
      displayTime,
      departmentColor,
      backgroundColor
    });

    await newHoliday.save();
    res.status(201).json({ 
      success: true, 
      message: "Event created successfully",
      data: newHoliday 
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Event already exists for this date and department"
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Get all events with optional date range filtering
router.get("/fetch", async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    let filter = {};
    
    if (startDate && endDate) {
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    if (department && department !== 'all') {
      filter.department = department;
    }

    const events = await Holiday.find(filter).sort({ date: 1 });
    
    // Format events for FullCalendar
    const formattedEvents = events.map(event => ({
      id: event._id,
      title: event.title,
      start: event.date,
      backgroundColor: event.backgroundColor,
      borderColor: event.backgroundColor,
      extendedProps: {
        department: event.department,
        status: event.status,
        startTime: event.startTime,
        endTime: event.endTime,
        title: event.title,
        description: event.description,
        displayTime: event.displayTime,
        departmentColor: event.departmentColor
      }
    }));

    res.json({ 
      success: true, 
      data: formattedEvents,
      total: events.length 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Get event by ID
router.get("/:id", async (req, res) => {
  try {
    const event = await Holiday.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Update an event
router.put("/:id", async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      department,
      status,
      startTime,
      endTime,
      displayTime,
      departmentColor,
      backgroundColor
    } = req.body;

    // Check if another event exists with same date and department
    const existingEvent = await Holiday.findOne({
      date,
      department,
      _id: { $ne: req.params.id }
    });
    
    if (existingEvent) {
      return res.status(400).json({
        success: false,
        error: "Another event already exists for this date and department"
      });
    }

    const updatedEvent = await Holiday.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        date,
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

    if (!updatedEvent) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    res.json({ 
      success: true, 
      message: "Event updated successfully",
      data: updatedEvent 
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Another event already exists for this date and department"
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Delete an event
router.delete("/:id", async (req, res) => {
  try {
    const deletedEvent = await Holiday.findByIdAndDelete(req.params.id);
    if (!deletedEvent) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }
    res.json({ 
      success: true, 
      message: "Event deleted successfully" 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Get events by department
router.get("/department/:dept", async (req, res) => {
  try {
    const events = await Holiday.find({ department: req.params.dept }).sort({ date: 1 });
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Get events statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const stats = await Holiday.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          holidays: {
            $sum: {
              $cond: [{ $in: ["$status", ["Full Day Holiday", "Half Day Holiday"]] }, 1, 0]
            }
          },
          workingDays: {
            $sum: {
              $cond: [{ $eq: ["$status", "Working Day"] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;