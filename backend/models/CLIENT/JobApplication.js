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
        "rejected",
        "suspended",
      ],
      default: "pending",
    },

    stageHistory: [
      {
        stage: {
          type: String,
          enum: [
            "pending",
            "reviewed",
            "technical_test",
            "interview",
            "final_interview",
            "offer",
            "hired",
            "rejected",
            "suspended",
          ],
          required: true,
        },
        date: { type: Date, default: Date.now },
        note: { type: String, default: "" },
        changedBy: { type: String, default: "System" },
      },
    ],

    // Training & Field Work Tracking (Only for hired candidates)
    training: {
      startDate: { type: Date },
      endDate: { type: Date },
      completed: { type: Boolean, default: false },
      notes: { type: String },
      trainer: { type: String },
    },

    fieldWork: {
      startDate: { type: Date },
      endDate: { type: Date },
      totalDays: { type: Number, default: 7 },
      completedDays: { type: Number, default: 0 },
      dailyProgress: [
        {
          day: { type: Number, required: true }, // 1 to 7
          date: { type: Date, required: true },
          status: {
            type: String,
            enum: [
              "pending",
              "completed",
              "absent",
              "sick_leave",
              "other_leave",
            ],
            default: "pending",
          },
          notes: { type: String },
          hoursWorked: { type: Number, default: 8 },
          supervisor: { type: String },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      overallPerformance: {
        rating: { type: Number, min: 1, max: 5 },
        feedback: { type: String },
        evaluatedBy: { type: String },
        evaluationDate: { type: Date },
      },
    },

    // Suspension tracking
    suspension: {
      isSuspended: { type: Boolean, default: false },
      suspendedDate: { type: Date },
      suspensionReason: {
        type: String,
        enum: [
          "poor_performance",
          "attendance_issues",
          "disciplinary",
          "health_issues",
          "voluntary_withdrawal",
          "other",
        ],
      },
      suspensionNotes: { type: String },
      suspendedBy: { type: String },
      reinstatementDate: { type: Date },
    },

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
    hiredDate: { type: Date },
  },
  { timestamps: true }
);

// Index for better query performance
jobApplicationSchema.index({ jobId: 1, email: 1 });
jobApplicationSchema.index({ status: 1 });
jobApplicationSchema.index({ appliedDate: -1 });
jobApplicationSchema.index({ hiredDate: -1 });

// Method to check if field work is completed
jobApplicationSchema.methods.isFieldWorkCompleted = function () {
  return this.fieldWork.completedDays >= this.fieldWork.totalDays;
};

// Method to check if training is overdue
jobApplicationSchema.methods.isTrainingOverdue = function () {
  if (!this.training.endDate) return false;
  return new Date() > this.training.endDate && !this.training.completed;
};

// Method to check if field work is overdue
jobApplicationSchema.methods.isFieldWorkOverdue = function () {
  if (!this.fieldWork.endDate) return false;
  return new Date() > this.fieldWork.endDate && !this.isFieldWorkCompleted();
};

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
