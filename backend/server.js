require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const mongoose = require("mongoose");
const jobApplicationRoutes = require("./routes/ClientRoutes/JobApplicationRoute");

// Imported All Routes
const allEmployeeAuthRoute = require("./routes/AllEmployeeAuthRoute/login");

// CEO all routes
const hrSectionRoutes = require("./routes/CeoRoutes/HrSection");
const ceoTaskRoutes = require("./routes/CeoRoutes/TasksMeetingsSection");
const CeoProfileSection = require("./routes/CeoRoutes/CeoProfileSection");
const ceoMeetingRoutes = require("./routes/CeoRoutes/MeetingRoutes");

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
const hrProfileRoutes = require("./routes/HrRoutes/HrProfileSection");
const AttendanceManagementRoutes = require("./routes/HrRoutes/AttendanceManagementSection");

//TL All Routes
const TLTaskRoutes = require("./routes/TeamLeaderRoutes/TasksMeetingsSection");
const TLMeetingRoutes = require("./routes/TeamLeaderRoutes/MeetingRoutes");
const TLProfileRoutes = require("./routes/TeamLeaderRoutes/TeamLeaderProfileSection");
const TLAttendanceRoutes = require("./routes/TeamLeaderRoutes/attendance");

// Sales Employee All Routes
const salesEmployeeMeetingRoutes = require("./routes/SalesEmployeeRoutes/S_meetings");
const salesEmployeeRoutes = require("./routes/HrRoutes/SalesEmployeeSection");
const salesEmployeeTaskRoutes = require("./routes/SalesEmployeeRoutes/tasks");
const salesEmployeeAttendanceRoutes = require("./routes/SalesEmployeeRoutes/S_attendance");
const farmerLeadRoutes = require("./routes/SalesEmployeeRoutes/farmerLeads");

const app = express();
connectDB();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        "https://fisheries-backend-1.onrender.com",
        "http://localhost:3000",
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

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Fisheries Backend API is running",
    version: "1.0.0",
    health: "/api/health",
  });
});

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
app.use("/api/sales-employee", farmerLeadRoutes);

app.get("/api/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  res.json({
    success: true,
    message: "Server is running successfully",
    database: dbStatus,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // CORS error handling
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation",
    });
  }
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "production" ? {} : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `✅ Server running on port ${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
});
