const express = require("express");
const router = express.Router();
const JobApplication = require("../../models/CLIENT/JobApplication");
const Hiring = require("../../models/HR/Hiring");

// ✅ Submit a job application
router.post("/submit", async (req, res) => {
  try {
    const {
      jobId,
      // Personal Information
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      nationality,
      address,
      city,
      state,
      zipCode,
      linkedIn,
      portfolio,

      // Work Authorization
      workAuthorized,
      visaSponsorship,

      // Work Experience
      workExperiences,

      // Education
      educations,

      // References
      references,

      // Additional fields
      skills,
      employmentPreferences,
      documents,
      additionalInfo,
      emergencyContact,
      consentAgreement,
    } = req.body;

    // Check if job exists
    const job = await Hiring.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job posting not found",
      });
    }

    // Check if user has already applied for this job
    const existingApplication = await JobApplication.findOne({
      jobId,
      email,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: "You have already applied for this position",
      });
    }

    // Create new application
    const newApplication = new JobApplication({
      jobId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dateOfBirth || null,
      nationality,
      address,
      city,
      state,
      zipCode,
      linkedIn,
      portfolio,
      workAuthorized,
      visaSponsorship,
      workExperiences,
      educations,
      references,
      skills,
      employmentPreferences,
      documents,
      additionalInfo,
      emergencyContact,
      consentAgreement,
    });

    await newApplication.save();

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: newApplication,
    });
  } catch (err) {
    console.error("Application submission error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ Get all job applications (for HR)
router.get("/all", async (req, res) => {
  try {
    const applications = await JobApplication.find()
      .populate("jobId", "title department")
      .sort({ appliedDate: -1 });

    res.json({
      success: true,
      data: applications,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ Get applications for a specific job
router.get("/job/:jobId", async (req, res) => {
  try {
    const applications = await JobApplication.find({
      jobId: req.params.jobId,
    })
      .populate("jobId", "title department")
      .sort({ appliedDate: -1 });

    res.json({
      success: true,
      data: applications,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ Get a single application
router.get("/:id", async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id).populate(
      "jobId",
      "title department experience employmentType"
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    res.json({
      success: true,
      data: application,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ Update application status
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const application = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    res.json({
      success: true,
      message: "Application status updated",
      data: application,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ Delete an application
router.delete("/:id", async (req, res) => {
  try {
    const application = await JobApplication.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    res.json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
