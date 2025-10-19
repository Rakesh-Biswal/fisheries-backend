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
const ceoTaskRoutes = require("./routes/CeoRoutes/TasksMeetingsSection");
const ceoMeetingRoutes = require("./routes/CeoRoutes/MeetingRoutes"); // ✅ Add CEO meetings

// HR All Routes
const hrOverviewRoutes = require("./routes/HrRoutes/HrOverviewSection");
const teamLeaderRoutes = require("./routes/HrRoutes/TeamLeaderSection");
const accountantRoutes = require("./routes/HrRoutes/AccountantSection");
const telecallerRoutes = require("./routes/HrRoutes/TeleCallerSection");
const salesEmployeeRoutes = require("./routes/HrRoutes/SalesEmployeeSection");
const projectManagerRoutes = require("./routes/HrRoutes/ProjectManagerSection");
const hiringRoutes = require("./routes/HrRoutes/HiringSection");
const taskMeetingsRoutes = require("./routes/HrRoutes/TasksMeetingsSection");
const attendanceCalendarRoutes = require("./routes/HrRoutes/attendanceRoutes");
const hrMeetingRoutes = require("./routes/HrRoutes/MeetingRoutes");

// TL All Routes
const TLTaskRoutes = require("./routes/TeamLeaderRoutes/TasksMeetingsSection");
const TLMeetingRoutes = require("./routes/TeamLeaderRoutes/MeetingRoutes"); // ✅ Add TL meetings

// Project Manager Routes
const PMMeetingRoutes = require("./routes/ProjectManagerRoutes/MeetingRoutes"); // ✅ Add PM meetings

// Accountant Routes
const AccountantMeetingRoutes = require("./routes/AccountantRoutes/MeetingRoutes"); // ✅ Add Accountant meetings

// Telecaller Routes
const TelecallerMeetingRoutes = require("./routes/TelecallerRoutes/MeetingRoutes"); // ✅ Add Telecaller meetings

// Sales Employee Routes
const SalesMeetingRoutes = require("./routes/SalesRoutes/MeetingRoutes"); // ✅ Add Sales meetings

const app = express();
connectDB();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));

// All Routes end-points
app.use("/api/employee", allEmployeeAuthRoute);

// CEO routes end-points
app.use("/api/ceo/hr", hrSectionRoutes);
app.use("/api/ceo/tasks-meetings", ceoTaskRoutes);
app.use("/api/ceo/meetings", ceoMeetingRoutes); // ✅ CEO meetings

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
app.use("/api/hr/tasks-meetings", taskMeetingsRoutes);
app.use("/api/hr/meetings", hrMeetingRoutes);

// TL routes end-points
app.use("/api/tl/tasks-meetings", TLTaskRoutes);
app.use("/api/tl/meetings", TLMeetingRoutes); // ✅ TL meetings

// Project Manager routes end-points
app.use("/api/project-manager/meetings", PMMeetingRoutes); // ✅ PM meetings

// Accountant routes end-points
app.use("/api/accountant/meetings", AccountantMeetingRoutes); // ✅ Accountant meetings

// Telecaller routes end-points
app.use("/api/telecaller/meetings", TelecallerMeetingRoutes); // ✅ Telecaller meetings

// Sales routes end-points
app.use("/api/sales/meetings", SalesMeetingRoutes); // ✅ Sales meetings

// Global meeting routes (if needed for cross-department queries)
// app.use("/api/meetings", globalMeetingRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running successfully",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use((err, req, res, next) => {
  console.error("🚨 Global Error Handler:", err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👑 CEO Dashboard: http://localhost:${PORT}/api/ceo/hr/dashboard`);
  console.log(`👥 HR Meetings: http://localhost:${PORT}/api/hr/meetings/fetch-all`);
  console.log(`📊 Meeting Endpoints by Department:`);
  console.log(`   - CEO: http://localhost:${PORT}/api/ceo/meetings/fetch-all`);
  console.log(`   - Team Leader: http://localhost:${PORT}/api/tl/meetings/fetch-all`);
  console.log(`   - Project Manager: http://localhost:${PORT}/api/project-manager/meetings/fetch-all`);
  console.log(`   - Accountant: http://localhost:${PORT}/api/accountant/meetings/fetch-all`);
  console.log(`   - Telecaller: http://localhost:${PORT}/api/telecaller/meetings/fetch-all`);
  console.log(`   - Sales: http://localhost:${PORT}/api/sales/meetings/fetch-all\n`);
});