const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Full Day Holiday", "Half Day Holiday", "Working Day"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    startTime: {
      type: String,
      default: "09:00",
    },
    endTime: {
      type: String,
      default: "17:00",
    },
    date: {
      type: String, // Store date as YYYY-MM-DD
      required: true,
    },
    createdBy: {
      type: String, // Later: store HR/admin user id
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Holiday", holidaySchema);
