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
router.get("/", async (req, res) => {
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
    const updated = await Hiring.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

module.exports = router;
