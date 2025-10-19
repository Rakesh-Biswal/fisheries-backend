const express = require("express")
const bcrypt = require("bcryptjs")
const SalesEmployeeEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee")
const SalesEmployeeBusinessData = require("../../models/SALESEMPLOYEE/SalesEmployeeBusinessData")
const HrEmployee = require("../../models/HR/HrEmployee")
const authenticateToken  = require("./HrAuthMiddlewear");

const router = express.Router()

// Get all sales employees
router.get("/fetch-data", async (req, res) => {
  try {
    const salesEmployees = await SalesEmployeeEmployee.find({ status: "active" })
      .populate("businessData")
      .select("-password")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: salesEmployees,
      count: salesEmployees.length,
    })
  } catch (error) {
    console.error("Error fetching sales employees:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales employees",
      error: error.message,
    })
  }
})

// Hire new sales employee
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
      assignedZone,
      monthlyTarget,
    } = req.body

    const hrId = req.user?.id 
    if (!hrId) {
      return res.status(401).json({
        success: false,
        message: "HR authentication required",
      })
    }

    // Check if email already exists
    const existingEmployee = await SalesEmployeeEmployee.findOne({ companyEmail: email })
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: "Sales employee with this email already exists",
      })
    }

    // Verify referring HR exists
    const referringHr = await HrEmployee.findById(hrId)
    if (!referringHr) {
      return res.status(400).json({
        success: false,
        message: "Invalid HR reference",
      })
    }

    // Generate employee code
    const empCode = `SE${Date.now().toString().slice(-6)}`

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create sales employee record
    const salesEmployeeEmployee = new SalesEmployeeEmployee({
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
      photo: photoUrl || null,
      empCode,
      status: "active",
      role: "sales-employee",
      referredBy: hrId,
    })

    const savedEmployee = await salesEmployeeEmployee.save()

    // Create business data record
    const salesEmployeeBusinessData = new SalesEmployeeBusinessData({
      employeeId: savedEmployee._id,
      empCode,
      employeeType: employeeType || "full-time",
      department: department || "Sales",
      designation: designation || "Sales Executive",
      joiningDate: joiningDate || new Date(),
      salary: salary || 0,
      assignedZone: assignedZone || "",
      monthlyTarget: monthlyTarget || 0,
      deptStatus: "active",
      probationPeriod: 6,
      reportingManager: hrId,
    })

    const savedBusinessData = await salesEmployeeBusinessData.save()

    // Update sales employee with business data reference
    savedEmployee.businessData = savedBusinessData._id
    await savedEmployee.save()

    // Return success response without password
    const responseData = savedEmployee.toObject()
    delete responseData.password

    res.status(201).json({
      success: true,
      message: "Sales employee hired successfully",
      data: {
        ...responseData,
        businessData: savedBusinessData,
      },
    })
  } catch (error) {
    console.error("Error hiring sales employee:", error)
    res.status(500).json({
      success: false,
      message: "Failed to hire sales employee",
      error: error.message,
    })
  }
})

// Get project manager profile details
router.get("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params

    const projectManager = await SalesEmployeeEmployee.findById(id)
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
