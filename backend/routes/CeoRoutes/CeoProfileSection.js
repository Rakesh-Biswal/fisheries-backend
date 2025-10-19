const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Ceo = require('../../models/CEO/CeoPi');
const ceoAuth = require('./CeoAuthMiddlewear');

// Get CEO profile data
router.get('/fetch', ceoAuth, async (req, res) => {
  try {
    const ceo = await Ceo.findById(req.ceo.id).select('-password');
    
    if (!ceo) {
      return res.status(404).json({
        success: false,
        message: 'CEO profile not found'
      });
    }

    res.json({
      success: true,
      data: ceo
    });
  } catch (error) {
    console.error('Error fetching CEO profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile data'
    });
  }
});

// Update CEO profile
router.put('/update-profile-data', ceoAuth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required'
      });
    }

    // Check if email is already taken by another CEO
    const existingCeo = await Ceo.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: req.ceo.id } 
    });

    if (existingCeo) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    const updatedCeo = await Ceo.findByIdAndUpdate(
      req.ceo.id,
      {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim()
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedCeo
    });
  } catch (error) {
    console.error('Error updating CEO profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Change password
router.put('/change-password', ceoAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required'
      });
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    // Check password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Get CEO with password
    const ceo = await Ceo.findById(req.ceo.id);
    if (!ceo) {
      return res.status(404).json({
        success: false,
        message: 'CEO not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, ceo.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    ceo.password = hashedPassword;
    await ceo.save();

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

module.exports = router;