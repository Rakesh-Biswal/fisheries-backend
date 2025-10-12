const express = require("express");
const mongoose = require("mongoose");
const Meeting = require("../../models/TEAMLEADER/Meeting");
const MeetingAttendance = require("../../models/TEAMLEADER/MeetingAttendance");
const TeamLeaderEmployee = require("../../models/TEAMLEADER/TeamLeaderEmployee");
const SalesEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee");
const ProjectManager = require("../../models/PROJECTMANAGER/ProjectManagerEmployee");
const { authenticateToken } = require("../../middleware/authMiddleware");
const upload = require("../../config/multerConfig");

const router = express.Router();

// All your meeting routes here (the complete code from previous response)
// ... [paste all the route handlers from the previous code] ...

module.exports = router;