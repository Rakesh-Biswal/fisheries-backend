const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hiring",
      required: true,
    },
    // Personal Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    nationality: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    linkedIn: { type: String },
    portfolio: { type: String },

    // Work Authorization
    workAuthorized: { type: String, enum: ["yes", "no"], required: true },
    visaSponsorship: { type: String, enum: ["yes", "no"], required: true },

    // Application Status & History
    status: {
      type: String,
      enum: [
        "pending",
        "reviewed",
        "technical_test",
        "interview",
        "final_interview",
        "offer",
        "hired",
        "suspended",
        "rejected",
      ],
      default: "pending",
    },

    // Post-hire information
    postHireInfo: {
      hireDate: { type: Date },
      trainingStartDate: { type: Date },
      trainingEndDate: { type: Date },
      fieldWorkStartDate: { type: Date },
      fieldWorkEndDate: { type: Date },
      fieldWorkDays: [
        {
          day: { type: Number, min: 1, max: 7 },
          date: { type: Date },
          completed: { type: Boolean, default: false },
          notes: { type: String },
          rating: {
            type: Number,
            min: 0, // Changed from 1 to 0 to allow unrated days
            max: 5,
            default: 0, // Added default value
          },
          completedAt: { type: Date },
        },
      ],
      tempEmploymentStartDate: { type: Date },
      tempEmploymentEndDate: { type: Date },
      suspensionReason: { type: String },
      suspensionDate: { type: Date },
    },

    stageHistory: [
      {
        stage: {
          type: String,
          enum: [
            "pending",
            "reviewed",
            "phone_screen", // Added back phone_screen for backward compatibility
            "technical_test",
            "interview",
            "final_interview",
            "offer",
            "hired",
            "suspended",
            "rejected",
          ],
          required: true,
        },
        date: { type: Date, default: Date.now },
        note: { type: String, default: "" },
        changedBy: { type: String, default: "System" },
      },
    ],

    // Work Experience
    workExperiences: [
      {
        company: { type: String, required: true },
        position: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        currentJob: { type: Boolean, default: false },
        description: { type: String, required: true },
        salary: { type: String },
      },
    ],

    // Education
    educations: [
      {
        institution: { type: String, required: true },
        degree: { type: String, required: true },
        fieldOfStudy: { type: String, required: true },
        graduationDate: { type: Date, required: true },
        gpa: { type: String },
      },
    ],

    // References
    references: [
      {
        name: { type: String, required: true },
        relationship: { type: String, required: true },
        company: { type: String },
        phone: { type: String, required: true },
        email: { type: String },
      },
    ],

    // Additional fields
    skills: [String],
    expectedSalary: { type: String },
    resumeUrl: { type: String },
    coverLetter: { type: String },
    employmentPreferences: { type: Map, of: String },
    documents: [String],
    additionalInfo: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    consentAgreement: { type: Boolean, default: false },

    // Timestamps
    appliedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for better query performance
jobApplicationSchema.index({ jobId: 1, email: 1 });
jobApplicationSchema.index({ status: 1 });
jobApplicationSchema.index({ appliedDate: -1 });

module.exports = mongoose.model("JobApplication", jobApplicationSchema);