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
const CeoProfileSection= require("./routes/CeoRoutes/CeoProfileSection");
const ceoMeetingRoutes= require("./routes/CeoRoutes/MeetingRoutes");

// HR All Routes
const hrOverviewRoutes = require("./routes/HrRoutes/HrOverviewSection");
const teamLeaderRoutes = require("./routes/HrRoutes/TeamLeaderSection");
const accountantRoutes = require("./routes/HrRoutes/AccountantSection");
const telecallerRoutes = require("./routes/HrRoutes/TeleCallerSection");
const projectManagerRoutes = require("./routes/HrRoutes/ProjectManagerSection");
const hiringRoutes = require("./routes/HrRoutes/HiringSection");
const taskMeetingsRoutes = require("./routes/HrRoutes/TasksMeetingsSection");
const attendanceCalendarRoutes = require("./routes/HrRoutes/attendanceRoutes");
const MeetingRoutes = require("./routes/HrRoutes/MeetingRoutes");
const hrProfileRoutes=require("./routes/HrRoutes/HrProfileSection")
const AttendanceManagementRoutes=require("./routes/HrRoutes/AttendanceManagementSection")


//TL All Routes
const TLTaskRoutes= require("./routes/TeamLeaderRoutes/TasksMeetingsSection")
const TLMeetingRoutes= require("./routes/TeamLeaderRoutes/MeetingRoutes")
const TLProfileRoutes=require("./routes/TeamLeaderRoutes/TeamLeaderProfileSection")
const TLAttendanceRoutes=require("./routes/TeamLeaderRoutes/attendance")


// Sales Employee All Routes
const salesEmployeeMeetingRoutes = require("./routes/SalesEmployeeRoutes/S_meetings");
const salesEmployeeRoutes = require("./routes/HrRoutes/SalesEmployeeSection");
const salesEmployeeTaskRoutes = require("./routes/SalesEmployeeRoutes/tasks");
const salesEmployeeAttendanceRoutes = require("./routes/SalesEmployeeRoutes/S_attendance");



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

// All Routes end-points
app.use("/api/employee", allEmployeeAuthRoute);

// CEO routes end-points
app.use("/api/ceo/hr", hrSectionRoutes);
app.use("/api/ceo/tasks-meetings", ceoTaskRoutes);
app.use("/api/ceo/meetings", ceoMeetingRoutes);
app.use("/api/ceo/profile", CeoProfileSection);


// HR routes end-points
app.use("/api/hr/overview", hrOverviewRoutes);
app.use("/api/hr/profile", hrProfileRoutes);
app.use("/api/hr/team-leaders", teamLeaderRoutes);
app.use("/api/hr/accountants", accountantRoutes);
app.use("/api/hr/telecaller", telecallerRoutes);
app.use("/api/hr/sales-employees", salesEmployeeRoutes);
app.use("/api/hr/project-manager", projectManagerRoutes);
app.use("/api/hr/hiring", hiringRoutes);
app.use("/api/client/job-applications", jobApplicationRoutes);
app.use("/api/hr/attendance-calendar", attendanceCalendarRoutes);
app.use("/api/hr/tasks-meetings", taskMeetingsRoutes);
app.use("/api/hr/meetings", MeetingRoutes);
app.use("/api/hr/attendance-management", AttendanceManagementRoutes);


// TL routes end-points
app.use("/api/tl/tasks-meetings", TLTaskRoutes);
app.use("/api/tl/meetings", TLMeetingRoutes);
app.use("/api/tl/profile", TLProfileRoutes);
app.use("/api/tl/attendance", TLAttendanceRoutes);


// Employee routes end-points
app.use("/api/sales-employee/tasks", salesEmployeeTaskRoutes);
app.use("/api/sales-employee/attendance", salesEmployeeAttendanceRoutes);
app.use("/api/sales-employee/meetings", salesEmployeeMeetingRoutes);


app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running successfully",
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});