require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db'); 
const jobApplicationRoutes = require("./routes/ClientRoutes/JobApplicationRoute");

// Imported All Routes
const allEmployeeAuthRoute = require("./routes/AllEmployeeAuthRoute/login");

// CEO all routes
const hrSectionRoutes = require("./routes/CeoRoutes/HrSection");

// HR All Routes
const hrOverviewRoutes = require("./routes/HrRoutes/HrOverviewSection");
const teamLeaderRoutes = require("./routes/HrRoutes/TeamLeaderSection");
const accountantRoutes = require("./routes/HrRoutes/AccountantSection");
const telecallerRoutes = require("./routes/HrRoutes/TeleCallerSection");
const salesEmployeeRoutes = require("./routes/HrRoutes/SalesEmployeeSection");
const projectManagerRoutes = require("./routes/HrRoutes/ProjectManagerSection");
const hiringRoutes = require("./routes/HrRoutes/HiringSection");

// Add this with your other HR routes imports
const attendanceCalendarRoutes = require("./routes/HrRoutes/attendanceRoutes");

// ✅ FIX: Import Team Leader Meeting Routes correctly
const teamLeaderMeetingRoutes = require("./routes/TeamLeaderRoutes/MeetingRoutes");

const app = express();
connectDB();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));

// ✅ ADD THIS: Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

//All Routes end-points
app.use("/api/employee", allEmployeeAuthRoute);

// CEO routes end-points
app.use("/api/ceo/hr", hrSectionRoutes);

// HR routes end-points
app.use("/api/hr/overview", hrOverviewRoutes);
app.use("/api/hr/team-leaders", teamLeaderRoutes);
app.use("/api/hr/accountants", accountantRoutes);
app.use("/api/hr/telecaller", telecallerRoutes);
app.use("/api/hr/sales-employees", salesEmployeeRoutes);
app.use("/api/hr/project-manager", projectManagerRoutes);
app.use("/api/hr/hiring", hiringRoutes);
app.use("/api/client/job-applications", jobApplicationRoutes);
app.use("/api/hr/attendance-calendar", attendanceCalendarRoutes);

// ✅ FIX: Team leader routes - Use correct variable name
app.use("/api/team-leader/meetings", teamLeaderMeetingRoutes);

// ✅ ADD: Test route to verify API is working
app.get("/api/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "API is working!",
    timestamp: new Date().toISOString()
  });
});

// ✅ ADD: Specific test route for meetings
app.get("/api/team-leader/meetings/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Meetings API endpoint is working!",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running successfully",
    timestamp: new Date().toISOString(),
  });
});

// Enhanced error handling for 404
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/health',
      '/api/test',
      '/api/team-leader/meetings',
      '/api/team-leader/meetings/test'
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('🚨 Global Error Handler:', err);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Test route: http://localhost:${PORT}/api/test`);
  console.log(`✅ Meetings test: http://localhost:${PORT}/api/team-leader/meetings/test`);
});
