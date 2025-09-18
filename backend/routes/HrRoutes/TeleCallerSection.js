const express = require("express")
const bcrypt = require("bcryptjs")
const TelecallerEmployee = require("../../models/TELECALLER/TelecallerEmployee")
const TelecallerBusinessData = require("../../models/TELECALLER/TelecallerBusinessData")
const HrEmployee = require("../../models/HR/HrEmployee")
const { authenticateToken } = require("./HrAuthMiddlewear");

const router = express.Router()

router.get("/fetch-data", async (req, res) => {
  try {
    const telecallers = await TelecallerEmployee.find({ status: "active" })
      .populate("businessData")
      .select("-password")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: telecallers,
      count: telecallers.length,
    })
  } catch (error) {
    console.error("Error fetching telecallers:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch telecallers",
      error: error.message,
    })
  }
})

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
      shift,
      dailyCallTarget,
      specialization,
    } = req.body

    // Check if email already exists
    const existingTelecaller = await TelecallerEmployee.findOne({ companyEmail: email })
    if (existingTelecaller) {
      return res.status(400).json({
        success: false,
        message: "Telecaller with this email already exists",
      })
    }

    // TODO: Replace with actual session/token extraction logic
    const referredBy = req.user?.id 

    if (!referredBy) {
      return res.status(401).json({
        success: false,
        message: "HR authentication required",
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

    const empCode = `TC${Date.now().toString().slice(-6)}`

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    const telecallerEmployee = new TelecallerEmployee({
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
      role: "telecaller",
      referredBy,
    })

    const savedTelecaller = await telecallerEmployee.save()

    const telecallerBusinessData = new TelecallerBusinessData({
      employeeId: savedTelecaller._id,
      empCode,
      employeeType: employeeType || "full-time",
      department: department || "Customer Service",
      designation: designation || "Telecaller",
      joiningDate: joiningDate || new Date(),
      salary: salary || 0,
      shift: shift || "",
      dailyCallTarget: dailyCallTarget || 0,
      specialization: specialization || "",
      deptStatus: "active",
      probationPeriod: 3, // Shorter probation for telecallers
      reportingManager: referredBy,
    })

    const savedBusinessData = await telecallerBusinessData.save()

    // Update telecaller with business data reference
    savedTelecaller.businessData = savedBusinessData._id
    await savedTelecaller.save()

    // Return success response without password
    const responseData = savedTelecaller.toObject()
    delete responseData.password

    res.status(201).json({
      success: true,
      message: "Telecaller hired successfully",
      data: {
        ...responseData,
        businessData: savedBusinessData,
      },
    })
  } catch (error) {
    console.error("Error hiring telecaller:", error)
    res.status(500).json({
      success: false,
      message: "Failed to hire telecaller",
      error: error.message,
    })
  }
})



module.exports = router
