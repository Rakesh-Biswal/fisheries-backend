const express = require("express");
const router = express.Router();
const JobApplication = require("../../models/CLIENT/JobApplication");
const Hiring = require("../../models/HR/Hiring");

// ✅ Submit a job application
router.post("/submit", async (req, res) => {
  try {
    // ... existing code ...
  } catch (err) {
    console.error("Application submission error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ Advance application status with proper stage tracking
router.put("/:id/advance-status", async (req, res) => {
  try {
    const { status, stageNote } = req.body;

    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    // Validate status transition
    const validTransitions = {
      pending: ["reviewed", "rejected"],
      reviewed: ["technical_test", "rejected"],
      technical_test: ["interview", "rejected"],
      interview: ["final_interview", "rejected"],
      final_interview: ["offer", "rejected"],
      offer: ["hired", "rejected"],
      hired: ["suspended"],
      suspended: [],
      rejected: [],
    };

    const currentStatus = application.status;
    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from ${currentStatus} to ${status}`,
      });
    }

    // Update stage history
    if (!application.stageHistory) {
      application.stageHistory = [];
    }

    application.stageHistory.push({
      stage: status,
      date: new Date(),
      note: stageNote || `Status changed to ${status}`,
    });

    // If hiring, set hire date
    if (status === "hired") {
      application.postHireInfo = {
        ...application.postHireInfo,
        hireDate: new Date(),
      };
    }

    // Update the status
    application.status = status;
    application.updatedAt = new Date();

    await application.save();

    res.json({
      success: true,
      message: "Application status updated successfully",
      data: application,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ Reject application
router.put("/:id/reject", async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    // Update stage history
    if (!application.stageHistory) {
      application.stageHistory = [];
    }

    application.stageHistory.push({
      stage: "rejected",
      date: new Date(),
      note: rejectionReason || "Application rejected",
    });

    // Update the status
    application.status = "rejected";
    application.updatedAt = new Date();

    await application.save();

    res.json({
      success: true,
      message: "Application rejected successfully",
      data: application,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ NEW: Schedule field work for hired candidate
router.put("/:id/schedule-field-work", async (req, res) => {
  try {
    const { fieldWorkStartDate } = req.body;

    console.log(
      "Scheduling field work for:",
      req.params.id,
      fieldWorkStartDate
    );

    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    if (application.status !== "hired") {
      return res.status(400).json({
        success: false,
        error: "Candidate must be hired to schedule field work",
      });
    }

    const startDate = new Date(fieldWorkStartDate);
    const trainingStartDate = new Date(startDate);
    trainingStartDate.setDate(trainingStartDate.getDate() - 2); // 2 days training before field work

    // Clean up stage history to remove invalid enum values
    if (application.stageHistory && application.stageHistory.length > 0) {
      application.stageHistory = application.stageHistory.map((stage) => {
        // Replace phone_screen with technical_test for backward compatibility
        if (stage.stage === "phone_screen") {
          return {
            ...stage,
            stage: "technical_test",
            note: stage.note
              ? stage.note.replace("phone_screen", "technical_test")
              : "Updated from phone_screen to technical_test",
          };
        }
        return stage;
      });
    }

    // Initialize field work days with proper default values
    const fieldWorkDays = [];
    for (let i = 1; i <= 7; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + (i - 1));
      fieldWorkDays.push({
        day: i,
        date: dayDate,
        completed: false,
        notes: "",
        rating: 0, // Start with 0 instead of null/undefined
        completedAt: null,
      });
    }

    // Calculate dates properly without mutation
    const fieldWorkEndDate = new Date(startDate);
    fieldWorkEndDate.setDate(fieldWorkEndDate.getDate() + 6);

    const tempEmploymentStartDate = new Date(startDate);
    tempEmploymentStartDate.setDate(tempEmploymentStartDate.getDate() + 7);

    const tempEmploymentEndDate = new Date(tempEmploymentStartDate);
    tempEmploymentEndDate.setMonth(tempEmploymentEndDate.getMonth() + 6);

    application.postHireInfo = {
      ...application.postHireInfo,
      hireDate: application.postHireInfo?.hireDate || new Date(),
      trainingStartDate,
      trainingEndDate: new Date(startDate), // Training ends when field work starts
      fieldWorkStartDate: startDate,
      fieldWorkEndDate: fieldWorkEndDate,
      fieldWorkDays,
      tempEmploymentStartDate,
      tempEmploymentEndDate,
    };

    // Validate the application before saving
    const validationError = application.validateSync();
    if (validationError) {
      console.error("Validation error before save:", validationError);
      return res.status(400).json({
        success: false,
        error: "Validation failed: " + validationError.message,
        details: validationError.errors,
      });
    }

    await application.save();

    res.json({
      success: true,
      message: "Field work scheduled successfully",
      data: application,
    });
  } catch (err) {
    console.error("Error scheduling field work:", err);

    // More detailed error response
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: Object.values(err.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ NEW: Update field work day completion
router.put("/:id/field-work-day/:dayNumber", async (req, res) => {
  try {
    const { completed, notes, rating } = req.body;
    const dayNumber = parseInt(req.params.dayNumber);

    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    if (!application.postHireInfo?.fieldWorkDays) {
      return res.status(400).json({
        success: false,
        error: "Field work not scheduled for this candidate",
      });
    }

    const dayIndex = application.postHireInfo.fieldWorkDays.findIndex(
      (day) => day.day === dayNumber
    );

    if (dayIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Field work day not found",
      });
    }

    application.postHireInfo.fieldWorkDays[dayIndex] = {
      ...application.postHireInfo.fieldWorkDays[dayIndex],
      completed:
        completed !== undefined
          ? completed
          : application.postHireInfo.fieldWorkDays[dayIndex].completed,
      notes: notes || application.postHireInfo.fieldWorkDays[dayIndex].notes,
      rating: rating || application.postHireInfo.fieldWorkDays[dayIndex].rating,
      completedAt: completed ? new Date() : null,
    };

    await application.save();

    res.json({
      success: true,
      message: `Field work day ${dayNumber} updated successfully`,
      data: application,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ NEW: Suspend candidate
router.put("/:id/suspend", async (req, res) => {
  try {
    const { suspensionReason } = req.body;

    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    if (application.status === "suspended") {
      return res.status(400).json({
        success: false,
        error: "Candidate is already suspended",
      });
    }

    // Update stage history
    if (!application.stageHistory) {
      application.stageHistory = [];
    }

    application.stageHistory.push({
      stage: "suspended",
      date: new Date(),
      note: suspensionReason || "Candidate suspended",
    });

    // Update the status
    application.status = "suspended";
    application.postHireInfo = {
      ...application.postHireInfo,
      suspensionReason,
      suspensionDate: new Date(),
    };
    application.updatedAt = new Date();

    await application.save();

    res.json({
      success: true,
      message: "Candidate suspended successfully",
      data: application,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ NEW: Revoke suspension and move to specified status
router.put("/:id/revoke-suspension", async (req, res) => {
  try {
    const { newStatus, revokeReason } = req.body;

    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    if (application.status !== "suspended") {
      return res.status(400).json({
        success: false,
        error: "Only suspended candidates can be revoked",
      });
    }

    // Validate the new status
    const validStatuses = [
      "hired",
      "interview",
      "final_interview",
      "offer",
      "technical_test",
    ];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status for revocation. Must be one of: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    // Update stage history
    application.stageHistory.push({
      stage: newStatus,
      date: new Date(),
      note: revokeReason || `Suspension revoked, moved to ${newStatus}`,
    });

    // Update the status
    application.status = newStatus;
    application.updatedAt = new Date();

    // Clear suspension info
    application.postHireInfo = {
      ...application.postHireInfo,
      suspensionReason: undefined,
      suspensionDate: undefined,
    };

    await application.save();

    res.json({
      success: true,
      message: `Suspension revoked successfully, candidate moved to ${newStatus}`,
      data: application,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ NEW: Complete 7-day field work and move to temp employment
router.put("/:id/complete-field-work", async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    if (application.status !== "hired") {
      return res.status(400).json({
        success: false,
        error: "Only hired candidates can complete field work",
      });
    }

    const completedDays =
      application.postHireInfo?.fieldWorkDays?.filter((day) => day.completed)
        .length || 0;

    if (completedDays < 7) {
      return res.status(400).json({
        success: false,
        error: "Candidate must complete all 7 field work days",
      });
    }

    // Update stage history
    application.stageHistory.push({
      stage: "hired",
      date: new Date(),
      note: "Successfully completed 7-day field work, moved to 6-month temp employment",
    });

    // Note: Status remains "hired" but we track the completion
    application.postHireInfo.fieldWorkCompleted = true;
    application.postHireInfo.fieldWorkCompletionDate = new Date();
    application.updatedAt = new Date();

    await application.save();

    res.json({
      success: true,
      message:
        "Field work completed successfully, candidate is now in 6-month temp employment",
      data: application,
    });
  } catch (err) {
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

// ✅ Update application status (general)
router.put("/:id/status", async (req, res) => {
  try {
    const { status, note } = req.body;

    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    // Update stage history
    if (!application.stageHistory) {
      application.stageHistory = [];
    }

    application.stageHistory.push({
      stage: status,
      date: new Date(),
      note: note || `Status changed to ${status}`,
    });

    application.status = status;
    application.updatedAt = new Date();

    await application.save();

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
