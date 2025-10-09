const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TeamLeaderEmployee = require('../../models/TEAMLEADER/TeamLeaderEmployee');
const TeamLeaderBusinessData = require('../../models/TEAMLEADER/TeamLeaderBusinessData');
const TLAuth = require('./TeamLeaderAuthMiddlewear');
const bcrypt = require('bcryptjs');

// Get team leader profile data
router.get('/fetch', TLAuth, async (req, res) => {
  try {
    const teamLeader = await TeamLeaderEmployee.findById(req.tl.id)
      .select('-password')
      .populate('businessData')
      .populate('referredBy', 'name companyEmail');

    if (!teamLeader) {
      return res.status(404).json({
        success: false,
        message: 'Team leader not found'
      });
    }

    res.json({
      success: true,
      data: teamLeader
    });
  } catch (error) {
    console.error('Error fetching team leader profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile data'
    });
  }
});

// Update team leader profile
router.put('/update-profile-data', TLAuth, async (req, res) => {
  try {
    const {
      name,
      phone,
      personalEmail,
      address,
      emergencyContact,
      qualification,
      experience,
      previousCompany,
      bankAccount
    } = req.body;

    const updatedData = {
      name,
      phone,
      personalEmail,
      address,
      emergencyContact,
      qualification,
      experience,
      previousCompany,
      bankAccount,
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(updatedData).forEach(key => {
      if (updatedData[key] === undefined) {
        delete updatedData[key];
      }
    });

    const teamLeader = await TeamLeaderEmployee.findByIdAndUpdate(
      req.tl.id,
      updatedData,
      { new: true, runValidators: true }
    ).select('-password')
    .populate('businessData')
    .populate('referredBy', 'name companyEmail');

    if (!teamLeader) {
      return res.status(404).json({
        success: false,
        message: 'Team leader not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: teamLeader
    });
  } catch (error) {
    console.error('Error updating team leader profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Update team leader photo
router.patch('/update-profile-photo', TLAuth, async (req, res) => {
  try {
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Photo URL is required'
      });
    }

    const teamLeader = await TeamLeaderEmployee.findByIdAndUpdate(
      req.tl.id,
      { photo: photoUrl, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!teamLeader) {
      return res.status(404).json({
        success: false,
        message: 'Team leader not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: teamLeader
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile photo'
    });
  }
});

// Change password
router.patch('/change-password', TLAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const teamLeader = await TeamLeaderEmployee.findById(req.tl.id);

    if (!teamLeader) {
      return res.status(404).json({
        success: false,
        message: 'Team leader not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, teamLeader.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    teamLeader.password = hashedPassword;
    teamLeader.updatedAt = new Date();
    await teamLeader.save();

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

// Update business data (limited fields that TL can update)
router.patch('/business-data', TLAuth, async (req, res) => {
  try {
    const { emergencyContact } = req.body;

    const teamLeader = await TeamLeaderEmployee.findById(req.tl.id);

    if (!teamLeader || !teamLeader.businessData) {
      return res.status(404).json({
        success: false,
        message: 'Team leader or business data not found'
      });
    }

    const updatedBusinessData = await TeamLeaderBusinessData.findByIdAndUpdate(
      teamLeader.businessData,
      {
        ...(emergencyContact && { emergencyContact }),
        updatedAt: new Date()
      },
      { new: true }
    );

    // Get updated team leader data
    const updatedTeamLeader = await TeamLeaderEmployee.findById(req.tl.id)
      .select('-password')
      .populate('businessData')
      .populate('referredBy', 'name companyEmail');

    res.json({
      success: true,
      message: 'Business data updated successfully',
      data: updatedTeamLeader
    });
  } catch (error) {
    console.error('Error updating business data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business data'
    });
  }
});

module.exports = router;