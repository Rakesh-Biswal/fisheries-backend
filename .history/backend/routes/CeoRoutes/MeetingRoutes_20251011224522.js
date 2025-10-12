const express = require("express");
const router = express.Router();

// Simple test route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "CEO Meetings route is working!"
  });
});

// Get all meetings for CEO
router.get("/fetch-all", (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: "CEO meetings fetched successfully"
    });
  } catch (error) {
    console.error("❌ Error fetching CEO meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings"
    });
  }
});

module.exports = router;