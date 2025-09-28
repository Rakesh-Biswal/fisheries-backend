const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect("mongodb://localhost:27017/hrms", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err));

// Import routes
const holidayRoutes = require("./routes/HR/olidayRoutes");
const hiringRoutes = require("./routes/HR/HiringRoutes"); // your existing

// Use routes
app.use("/api/holidays", holidayRoutes);
app.use("/api/hiring", hiringRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
