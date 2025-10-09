// routes/hr/attendanceCalendar.js
const express = require('express');
const router = express.Router();
const AttendanceCalendar = require('../../models/AttendanceCalendar');

// Get all events
router.get('/fetch', async (req, res) => {
  try {
    const events = await AttendanceCalendar.find().sort({ date: 1 });
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

// Create new event
router.post('/create', async (req, res) => {
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
      departmentColors,
      backgroundColor
    } = req.body;

    // Check if event already exists for this date and departments
    const existingEvent = await AttendanceCalendar.findOne({ 
      date,
      departments: { $in: departments }
    });

    if (existingEvent) {
      return res.status(400).json({
        success: false,
        error: 'An event already exists for this date and department(s)'
      });
    }

    const newEvent = new AttendanceCalendar({
      title,
      description,
      date,
      departments,
      status,
      startTime,
      endTime,
      displayTime,
      departmentColors,
      backgroundColor
    });

    const savedEvent = await newEvent.save();

    res.status(201).json({
      success: true,
      data: savedEvent,
      message: 'Event created successfully'
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      date,
      departments,
      status,
      startTime,
      endTime,
      displayTime,
      departmentColors,
      backgroundColor
    } = req.body;

    // Check if event exists
    const existingEvent = await AttendanceCalendar.findById(id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check for duplicate events (excluding current event)
    const duplicateEvent = await AttendanceCalendar.findOne({
      _id: { $ne: id },
      date,
      departments: { $in: departments }
    });

    if (duplicateEvent) {
      return res.status(400).json({
        success: false,
        error: 'Another event already exists for this date and department(s)'
      });
    }

    const updatedEvent = await AttendanceCalendar.findByIdAndUpdate(
      id,
      {
        title,
        description,
        date,
        departments,
        status,
        startTime,
        endTime,
        displayTime,
        departmentColors,
        backgroundColor,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedEvent,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error('Error updating event:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(val => val.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEvent = await AttendanceCalendar.findByIdAndDelete(id);

    if (!deletedEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await AttendanceCalendar.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch event'
    });
  }
});

module.exports = router;