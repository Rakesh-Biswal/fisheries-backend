require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db'); // Import your existing DB connection

// Import routes
const allEmployeeAuthRoute = require('./routes/AllEmployeeAuthRoute/login');
const hrSectionRoutes = require('./routes/CeoRoutes/HrSection'); // HR Section routes for CEO dashboard


const hrOverviewRoutes = require('./routes/HrRoutes/HrOverviewSection');
const teamLeaderRoutes = require('./routes/HrRoutes/TeamLeaderSection');
const accountantRoutes = require('./routes/HrRoutes/AccountantSection');
const telecallerRoutes = require('./routes/HrRoutes/TeleCallerSection');
const salesEmployeeRoutes = require('./routes/HrRoutes/SalesEmployeeSection');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for JSON data
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For form data
app.use(cookieParser());

// Serve uploaded files statically (if you still need this for other files)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/employee', allEmployeeAuthRoute);

// HR Section routes for CEO
app.use('/api/ceo/hr', hrSectionRoutes); 


app.use('/api/hr/overview', hrOverviewRoutes);
app.use('/api/hr/team-leaders', teamLeaderRoutes);
app.use('/api/hr/accountants', accountantRoutes);
app.use('/api/hr/telecaller', telecallerRoutes);
app.use('/api/hr/sales-employee', salesEmployeeRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`✅ CEO HR Dashboard available at: http://localhost:${PORT}/api/ceo/hr/dashboard`);
});