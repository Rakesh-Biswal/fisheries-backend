const mongoose = require("mongoose");

const HiringSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  openings: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  qualification: { type: String, required: true },
  department: { type: String, required: true },
  postedDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "expired"], default: "active" },
});

module.exports = mongoose.model("Hiring", HiringSchema);
