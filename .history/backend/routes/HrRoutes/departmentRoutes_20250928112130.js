// backend/routes/HR/departmentRoutes.js
const express = require("express");
const router = express.Router();
const Department = require("../../models/HR/Department");

// ✅ Get all departments
router.get("/", async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    
    res.json({
      success: true,
      data: departments,
      count: departments.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Create new department
router.post("/create", async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if department already exists
    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        error: "Department already exists"
      });
    }

    const newDepartment = new Department({
      name,
      description
    });

    await newDepartment.save();
    
    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: newDepartment
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Update department
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedDepartment = await Department.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedDepartment) {
      return res.status(404).json({
        success: false,
        error: "Department not found"
      });
    }
    
    res.json({
      success: true,
      message: "Department updated successfully",
      data: updatedDepartment
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Delete department (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedDepartment = await Department.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!deletedDepartment) {
      return res.status(404).json({
        success: false,
        error: "Department not found"
      });
    }
    
    res.json({
      success: true,
      message: "Department deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;