const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hiring",
      required: true,
    },
    // Personal Information
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
    },
    nationality: {
      type: String,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    linkedIn: {
      type: String,
    },
    portfolio: {
      type: String,
    },

    // Work Authorization
    workAuthorized: {
      type: String,
      enum: ["yes", "no"],
      required: true,
    },
    visaSponsorship: {
      type: String,
      enum: ["yes", "no"],
      required: true,
    },
    stageHistory: [
      {
        stage: {
          type: String,
          enum: ["pending", "reviewed", "interview", "hired", "rejected"],
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          default: "",
        },
      },
    ],
    // Work Experience
    workExperiences: [
      {
        company: {
          type: String,
          required: true,
        },
        position: {
          type: String,
          required: true,
        },
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
        },
        currentJob: {
          type: Boolean,
          default: false,
        },
        description: {
          type: String,
          required: true,
        },
        salary: {
          type: String,
        },
      },
    ],

    // Education
    educations: [
      {
        institution: {
          type: String,
          required: true,
        },
        degree: {
          type: String,
          required: true,
        },
        fieldOfStudy: {
          type: String,
          required: true,
        },
        graduationDate: {
          type: Date,
          required: true,
        },
        gpa: {
          type: String,
        },
      },
    ],

    // References
    references: [
      {
        name: {
          type: String,
          required: true,
        },
        relationship: {
          type: String,
          required: true,
        },
        company: {
          type: String,
        },
        phone: {
          type: String,
          required: true,
        },
        email: {
          type: String,
        },
      },
    ],

    // Additional fields (you mentioned other sections)
    skills: [String],
    employmentPreferences: {
      type: Map,
      of: String,
    },
    documents: [String],
    additionalInfo: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    consentAgreement: {
      type: Boolean,
      default: false,
    },

    // Application status
    status: {
      type: String,
      enum: ["pending", "reviewed", "interview", "rejected", "hired"],
      default: "pending",
    },

    // Timestamps
    appliedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
