// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const mongoose = require("mongoose");




// Import Routes
const allEmployeeAuthRoute = require("./routes/AllEmployeeAuthRoute/login");

// CEO routes
const hrSectionRoutes = require("./routes/CeoRoutes/HrSection");
const ceoTaskRoutes = require("./routes/CeoRoutes/TasksMeetingsSection");
const CeoProfileSection = require("./routes/CeoRoutes/CeoProfileSection");
const ceoMeetingRoutes = require("./routes/CeoRoutes/MeetingRoutes");

// HR routes
const hrOverviewRoutes = require("./routes/HrRoutes/HrOverviewSection");
const teamLeaderRoutes = require("./routes/HrRoutes/TeamLeaderSection"); // HR Team Leader routes
const accountantRoutes = require("./routes/HrRoutes/AccountantSection");
const telecallerRoutes = require("./routes/HrRoutes/TeleCallerSection");
const projectManagerRoutes = require("./routes/HrRoutes/ProjectManagerSection");
const hiringRoutes = require("./routes/HrRoutes/HiringSection");
const taskMeetingsRoutes = require("./routes/HrRoutes/TasksMeetingsSection");
const attendanceCalendarRoutes = require("./routes/HrRoutes/attendanceRoutes");
const MeetingRoutes = require("./routes/HrRoutes/MeetingRoutes");
const hrProfileRoutes = require("./routes/HrRoutes/HrProfileSection");
const AttendanceManagementRoutes = require("./routes/HrRoutes/AttendanceManagementSection");
const holidayRoutes = require("./routes/HrRoutes/holidayRoutes");
const hrAttendanceDashboard = require("./routes/HrRoutes/AttendanceDashboard");


// TL routes
const TLTaskRoutes = require("./routes/TeamLeaderRoutes/TasksMeetingsSection");
const TLMeetingRoutes = require("./routes/TeamLeaderRoutes/MeetingRoutes");
const TLProfileRoutes = require("./routes/TeamLeaderRoutes/TeamLeaderProfileSection");
const TLAttendanceRoutes = require("./routes/TeamLeaderRoutes/attendance");
const TLTeamRoutes = require("./routes/TeamLeaderRoutes/teams");

// Sales Employee routes
const salesEmployeeMeetingRoutes = require("./routes/SalesEmployeeRoutes/S_meetings");
const salesEmployeeRoutes = require("./routes/HrRoutes/SalesEmployeeSection");
const salesEmployeeTaskRoutes = require("./routes/SalesEmployeeRoutes/tasks");
const salesEmployeeAttendanceRoutes = require("./routes/SalesEmployeeRoutes/S_attendance");
const farmerLeadRoutes = require("./routes/SalesEmployeeRoutes/farmerLeads");

// Project Manager Routes
const projectManagerFarmerRoutes = require("./routes/ProjectManagerRoutes/farmers");
const projectManagerPaymentRoutes = require("./routes/ProjectManagerRoutes/payments");
const projectManagerDashboardRoutes = require("./routes/ProjectManagerRoutes/dashboard");
const projectManagerAttendanceRoutes = require("./routes/ProjectManagerRoutes/attendance");

//Farmer Routes
const farmerLoginRoutes = require("./routes/FarmerRoutes/FarmerLoginRoutes");
const farmerRoutes = require("./routes/FarmerRoutes/farmerRoutes");

const app = express();

// Connect to Database
connectDB();

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// CORS Configuration
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Body Parsing Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Static Files
app.use("/uploads", express.static("uploads"));



// Root Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Fisheries Backend API is running",
    version: "1.0.0",
    health: "/api/health",
  });
});

// API Routes

// Employee Authentication
app.use("/api/employee", allEmployeeAuthRoute);

// CEO routes
app.use("/api/ceo/hr", hrSectionRoutes);
app.use("/api/ceo/tasks-meetings", ceoTaskRoutes);
app.use("/api/ceo/meetings", ceoMeetingRoutes);
app.use("/api/ceo/profile", CeoProfileSection);

// HR routes
app.use("/api/hr/overview", hrOverviewRoutes);
app.use("/api/hr/profile", hrProfileRoutes);
app.use("/api/hr/team-leaders", teamLeaderRoutes); // HR Team Leader routes
app.use("/api/hr/accountants", accountantRoutes);
app.use("/api/hr/telecaller", telecallerRoutes);
app.use("/api/hr/sales-employees", salesEmployeeRoutes);
app.use("/api/hr/project-manager", projectManagerRoutes);
app.use("/api/hr/hiring", hiringRoutes);
app.use("/api/hr/attendance-calendar", attendanceCalendarRoutes);
app.use("/api/hr/tasks-meetings", taskMeetingsRoutes);
app.use("/api/hr/meetings", MeetingRoutes);
app.use("/api/hr/attendance-management", AttendanceManagementRoutes);
app.use("/api/hr/holidays", holidayRoutes);
app.use("/api/hr/attendance-dashboard", hrAttendanceDashboard);


// TL routes
app.use("/api/tl/tasks-meetings", TLTaskRoutes);
app.use("/api/tl/meetings", TLMeetingRoutes);
app.use("/api/tl/profile", TLProfileRoutes);
app.use("/api/tl/attendance", TLAttendanceRoutes);
app.use("/api/tl/teams", TLTeamRoutes);

// Sales Employee routes
app.use("/api/sales-employee/tasks", salesEmployeeTaskRoutes);
app.use("/api/sales-employee/attendance", salesEmployeeAttendanceRoutes);
app.use("/api/sales-employee/meetings", salesEmployeeMeetingRoutes);
app.use("/api/sales-employee", farmerLeadRoutes);

// Project Manager Routes
app.use("/api/project-manager/farmers", projectManagerFarmerRoutes);
app.use("/api/project-manager/payments", projectManagerPaymentRoutes);
app.use("/api/project-manager/dashboard", projectManagerDashboardRoutes);
app.use("/api/pm/attendance", projectManagerAttendanceRoutes);

//Farmer Routes
app.use("/api/farmer/login", farmerLoginRoutes);
app.use("/api/farmer", farmerRoutes);

// Health Check Route
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  res.json({
    success: true,
    message: "Server is running successfully",
    database: dbStatus,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler - FIXED: Use proper route pattern
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Error Stack:", err.stack);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation",
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "production" ? {} : err.message,
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});