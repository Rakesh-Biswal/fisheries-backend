const express = require("express");
const router = express.Router();
const Hiring = require("../../models/HR/Hiring");

// ✅ Create a new hiring post
router.post("/create", async (req, res) => {
  try {
    const newHiring = new Hiring(req.body);
    await newHiring.save();
    res.status(201).json({ success: true, data: newHiring });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Get all hiring posts
router.get("/fetch", async (req, res) => {
  try {
    const posts = await Hiring.find();
    res.json({ success: true, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Update a hiring post
router.put("/:id", async (req, res) => {
  try {
    const updated = await Hiring.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Delete a hiring post
router.delete("/:id", async (req, res) => {
  try {
    await Hiring.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Hiring post deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Apply for a job
router.post("/apply", async (req, res) => {
  try {
    const {
      jobId,
      fullName,
      email,
      phoneNumber,
      location,
      birthDate,
      gender,
      expectedSalary,
      experience,
      testimonials,
    } = req.body;
    // CV file will come from form-data
    const cvFile = req.files?.cvFile; // if using multer

    const job = await Hiring.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    // You can create a JobApplication model to save applications
    // Example:
    const JobApplication = require("../../models/HR/JobApplication");
    const newApplication = new JobApplication({
      job: jobId,
      fullName,
      email,
      phoneNumber,
      location,
      birthDate,
      gender,
      expectedSalary,
      experience,
      cvFile: cvFile?.path || "",
      testimonials,
    });

    await newApplication.save();

    res.status(201).json({ success: true, data: newApplication });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const job = await Hiring.findById(req.params.id);
    if (!job)
      return res.status(404).json({ success: false, error: "Job not found" });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
module.exports = router;
