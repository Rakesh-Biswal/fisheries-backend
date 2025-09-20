const express = require("express")
const bcrypt = require("bcryptjs")
const ProjectManagerEmployee = require("../../models/PROJECTMANAGER/ProjectManagerEmployee")
const ProjectManagerBusinessData = require("../../models/PROJECTMANAGER/ProjectManagerBusinessData")
const HrEmployee = require("../../models/HR/HrEmployee")
const { authenticateToken } = require("./HrAuthMiddlewear");

const router = express.Router()

// Get all project managers
router.get("/fetch-data", async (req, res) => {
  try {
    const projectManagers = await ProjectManagerEmployee.find({ status: "active" })
      .populate("businessData")
      .select("-password")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: projectManagers,
      count: projectManagers.length,
    })
  } catch (error) {
    console.error("Error fetching project managers:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch project managers",
      error: error.message,
    })
  }
})

// Hire new project manager
router.post("/hire", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      aadhar,
      pan,
      photoUrl, 
      address,
      emergencyContact,
      bankAccount,
      employeeType,
      department,
      joiningDate,
      salary,
      designation,
      experience,
      qualification,
      previousCompany,
      assignedDomain,
      monthlyProjectTarget,
    } = req.body

    const referredBy = req.user.id;

    // Check if email already exists
    const existingManager = await ProjectManagerEmployee.findOne({ companyEmail: email })
    if (existingManager) {
      return res.status(400).json({
        success: false,
        message: "Project manager with this email already exists",
      })
    }

    // Verify referring HR exists
    const referringHr = await HrEmployee.findById(referredBy)
    if (!referringHr) {
      return res.status(400).json({
        success: false,
        message: "Invalid HR reference",
      })
    }

    // Generate employee code
    const empCode = `PM${Date.now().toString().slice(-6)}`

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create project manager employee record
    const projectManagerEmployee = new ProjectManagerEmployee({
      name,
      phone,
      companyEmail: email,
      password: hashedPassword,
      aadhar,
      pan,
      emergencyContact,
      address,
      qualification: qualification || "",
      experience: experience || 0,
      previousCompany: previousCompany || "",
      bankAccount,
      photo: photoUrl || null, // ✅ ensure this is a string
      empCode,
      status: "active",
      role: "project-manager",
      referredBy,
    })

    const savedManager = await projectManagerEmployee.save()

    // Create business data record
    const projectManagerBusinessData = new ProjectManagerBusinessData({
      employeeId: savedManager._id,
      empCode,
      employeeType: employeeType || "full-time",
      department: department || "Project Management",
      designation: designation || "Project Manager",
      joiningDate: joiningDate || new Date(),
      salary: salary || 0,
      assignedDomain: assignedDomain || "",
      monthlyProjectTarget: monthlyProjectTarget || 0,
      teamSize: 0,
      activeProjects: 0,
      deptStatus: "active",
      probationPeriod: 6,
      reportingManager: referredBy,
    })

    const savedBusinessData = await projectManagerBusinessData.save()

    // Update project manager with business data reference
    savedManager.businessData = savedBusinessData._id
    await savedManager.save()

    // Return success response without password
    const responseData = savedManager.toObject()
    delete responseData.password

    res.status(201).json({
      success: true,
      message: "Project manager hired successfully",
      data: {
        ...responseData,
        businessData: savedBusinessData,
      },
    })
  } catch (error) {
    console.error("Error hiring project manager:", error)
    res.status(500).json({
      success: false,
      message: "Failed to hire project manager",
      error: error.message,
    })
  }
})


// Get project manager profile details
router.get("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params

    const projectManager = await ProjectManagerEmployee.findById(id)
      .populate("businessData")
      .populate("referredBy", "name email")
      .select("-password")

    if (!projectManager) {
      return res.status(404).json({
        success: false,
        message: "Project manager not found",
      })
    }

    res.json({
      success: true,
      data: projectManager,
    })
  } catch (error) {
    console.error("Error fetching project manager profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch project manager profile details",
      error: error.message,
    })
  }
})

module.exports = router
