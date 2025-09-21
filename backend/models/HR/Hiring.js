const mongoose = require("mongoose");

const hiringSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    openings: {
      type: Number,
      required: true,
    },
    expiryDate: {
      type: String,
      required: true,
    },
    qualification: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    salary: {
      type: String,
      default: "",
    },
    employmentType: {
      type: String,
      default: "Full-time",
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
    },
    postedDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Hiring", hiringSchema);
