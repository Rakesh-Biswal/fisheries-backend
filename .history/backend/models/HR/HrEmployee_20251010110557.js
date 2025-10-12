const mongoose = require("mongoose")

const hrEmployeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    companyEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    aadhar: {
      type: String,
      required: true,
      unique: true,
    },
    pan: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    photo: {
      type: String,
      default: null,
    },
    empCode: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "terminated"],
      default: "active",
    },
    role: {
      type: String,
      default: "hr",
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    qualification: {
      degree: String,
      institution: String,
      year: Number,
    },
    experience: {
      type: Number,
      default: 0,
    },
    expectedSalary: {
      type: Number,
      default: 0,
    },
    businessData: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HrBusinessData",
    },
  },
  {
    timestamps: true,
  },
)

module.exports =
  mongoose.models.HrEmployee || mongoose.model("HrEmployee", hrEmployeeSchema);

