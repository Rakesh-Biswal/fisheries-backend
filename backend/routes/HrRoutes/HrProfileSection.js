const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const HrEmployee = require('../../models/HR/HrEmployee');
const HrBusinessData = require('../../models/HR/HrBusinessData');
const {authenticateToken} = require('./HrAuthMiddlewear');
const bcrypt = require('bcryptjs');

// Get HR profile data
router.get('/fetch', authenticateToken, async (req, res) => {
  try {
    const hrEmployee = await HrEmployee.findById(req.user.id)
      .populate('businessData')
      .select('-password'); // Exclude password from response

    if (!hrEmployee) {
      return res.status(404).json({
        success: false,
        message: 'HR employee not found'
      });
    }

    res.json({
      success: true,
      data: hrEmployee
    });
  } catch (error) {
    console.error('Error fetching HR profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile data'
    });
  }
});

// Update HR profile
router.put('/update-personal-info', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      phone,
      personalEmail,
      emergencyContact,
      address,
      qualification,
      experience
    } = req.body;

    // Update HR employee data
    const updatedEmployee = await HrEmployee.findByIdAndUpdate(
      req.user.id,
      {
        name,
        phone,
        personalEmail,
        emergencyContact,
        address,
        qualification,
        experience,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        message: 'HR employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating HR profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Update HR business data
router.put('/update-business-info', authenticateToken, async (req, res) => {
  try {
    const {
      employeeType,
      department,
      designation,
      joiningDate,
      deptStatus,
      probationPeriod,
      confirmationDate,
      reportingManager,
      performanceRating,
      notes
    } = req.body;

    // Find HR employee to get business data reference
    const hrEmployee = await HrEmployee.findById(req.user.id);
    if (!hrEmployee) {
      return res.status(404).json({
        success: false,
        message: 'HR employee not found'
      });
    }

    // Update or create business data
    let businessData;
    if (hrEmployee.businessData) {
      businessData = await HrBusinessData.findByIdAndUpdate(
        hrEmployee.businessData,
        {
          employeeType,
          department,
          designation,
          joiningDate,
          deptStatus,
          probationPeriod,
          confirmationDate,
          reportingManager,
          performanceRating,
          notes,
          updatedAt: new Date()
        },
        { new: true }
      );
    } else {
      businessData = new HrBusinessData({
        employeeId: req.user.id,
        empCode: hrEmployee.empCode,
        employeeType,
        department,
        designation,
        joiningDate,
        deptStatus,
        probationPeriod,
        confirmationDate,
        reportingManager,
        performanceRating,
        notes
      });
      await businessData.save();

      // Link business data to HR employee
      hrEmployee.businessData = businessData._id;
      await hrEmployee.save();
    }

    res.json({
      success: true,
      message: 'Business data updated successfully',
      data: businessData
    });
  } catch (error) {
    console.error('Error updating HR business data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business data'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Get HR employee with password
    const hrEmployee = await HrEmployee.findById(req.user.id);
    if (!hrEmployee) {
      return res.status(404).json({
        success: false,
        message: 'HR employee not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, hrEmployee.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    hrEmployee.password = hashedNewPassword;
    hrEmployee.updatedAt = new Date();
    await hrEmployee.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// Upload profile photo
router.put('/update-profile-photo', authenticateToken, async (req, res) => {
  try {
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Photo URL is required'
      });
    }

    const updatedEmployee = await HrEmployee.findByIdAndUpdate(
      req.user.id,
      {
        photo: photoUrl,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        message: 'HR employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile photo'
    });
  }
});

module.exports = router;