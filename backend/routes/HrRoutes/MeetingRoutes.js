const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Meeting = require('../../models/Meetings/Meeting');
const hrAuth = require('./HrAuthMiddlewear');

// Get all meetings organized by HR
router.get('/', hrAuth, async (req, res) => {
  try {
    const { date } = req.query;
    
    let query = { 
      organizer: req.hr.id,
      organizerModel: 'HREmployee'
    };
    
    // Filter by date if provided
    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      query.meetingDate = {
        $gte: selectedDate,
        $lt: nextDate
      };
    }

    const meetings = await Meeting.find(query)
      .sort({ meetingDate: -1, startTime: -1 });

    res.json({
      success: true,
      data: meetings
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meetings'
    });
  }
});

// Create new meeting
router.post('/', hrAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      meetingDate,
      startTime,
      endTime,
      participants,
      platform,
      meetingLink
    } = req.body;

    // Validate required fields
    if (!title || !description || !meetingDate || !startTime || !endTime || !participants) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate participants array
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one participant department is required'
      });
    }

    const meeting = new Meeting({
      title,
      description,
      meetingDate,
      startTime,
      endTime,
      participants,
      platform: platform || 'Google Meet',
      meetingLink: meetingLink || '',
      organizer: req.hr.id,
      organizerModel: 'HREmployee',
      organizerRole: 'hr'
    });

    await meeting.save();

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: meeting
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create meeting'
    });
  }
});

// Update meeting
router.put('/:id', hrAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      meetingDate,
      startTime,
      endTime,
      participants,
      platform,
      meetingLink,
      status
    } = req.body;

    const meeting = await Meeting.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizer: req.hr.id,
        organizerModel: 'HREmployee'
      },
      {
        title,
        description,
        meetingDate,
        startTime,
        endTime,
        participants,
        platform,
        meetingLink,
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      message: 'Meeting updated successfully',
      data: meeting
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update meeting'
    });
  }
});

// Delete meeting
router.delete('/:id', hrAuth, async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndDelete({
      _id: req.params.id,
      organizer: req.hr.id,
      organizerModel: 'HREmployee'
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete meeting'
    });
  }
});

// Get meeting statistics
router.get('/stats', hrAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = await Meeting.aggregate([
      { 
        $match: { 
          organizer: new mongoose.Types.ObjectId(req.hr.id),
          organizerModel: 'HREmployee'
        } 
      },
      {
        $group: {
          _id: null,
          totalMeetings: { $sum: 1 },
          todayMeetings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$meetingDate', today] },
                    { $lt: ['$meetingDate', tomorrow] }
                  ]
                },
                1,
                0
              ]
            }
          },
          scheduled: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalMeetings: 0,
      todayMeetings: 0,
      scheduled: 0,
      completed: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching meeting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meeting statistics'
    });
  }
});

module.exports = router;