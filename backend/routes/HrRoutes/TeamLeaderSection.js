const express = require("express")
const bcrypt = require("bcryptjs")
const TeamLeaderEmployee = require("../../models/TEAMLEADER/TeamLeaderEmployee")
const TeamLeaderBusinessData = require("../../models/TEAMLEADER/TeamLeaderBusinessData")
const HrEmployee = require("../../models/HR/HrEmployee")
const { authenticateToken } = require("./HrAuthMiddlewear");

const router = express.Router()

// Get all team leaders
router.get("/fetch-data", async (req, res) => {
    try {
        const teamLeaders = await TeamLeaderEmployee.find({ status: "active" })
            .populate("businessData")
            .select("-password")
            .sort({ createdAt: -1 })

        res.json({
            success: true,
            data: teamLeaders,
            count: teamLeaders.length,
        })
    } catch (error) {
        console.error("Error fetching team leaders:", error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch team leaders",
            error: error.message,
        })
    }
})

// Hire new team leader
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
    } = req.body;

    const referredBy = req.user.id;

    // Check if email already exists
    const existingLeader = await TeamLeaderEmployee.findOne({ companyEmail: email });
    if (existingLeader) {
      return res.status(400).json({
        success: false,
        message: "Team leader with this email already exists",
      });
    }

    // Verify referring HR exists
    const referringHr = await HrEmployee.findById(referredBy);
    if (!referringHr) {
      return res.status(400).json({
        success: false,
        message: "Invalid HR reference",
      });
    }

    // Generate employee code
    const empCode = `TL${Date.now().toString().slice(-6)}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create team leader employee record
    const teamLeaderEmployee = new TeamLeaderEmployee({
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
      role: "team-leader",
      referredBy,
    });

    const savedLeader = await teamLeaderEmployee.save();

    // Create business data record
    const teamLeaderBusinessData = new TeamLeaderBusinessData({
      employeeId: savedLeader._id,
      empCode,
      employeeType: employeeType || "full-time",
      department: department || "Sales",
      designation: designation || "Team Leader",
      joiningDate: joiningDate || new Date(),
      salary: salary || 0,
      assignedZone: assignedZone || "",
      monthlyTarget: monthlyTarget || 0,
      teamSize: 0,
      deptStatus: "active",
      probationPeriod: 6,
      reportingManager: referredBy,
    });

    const savedBusinessData = await teamLeaderBusinessData.save();

    // Update team leader with business data reference
    savedLeader.businessData = savedBusinessData._id;
    await savedLeader.save();

    // Return success response without password
    const responseData = savedLeader.toObject();
    delete responseData.password;

    res.status(201).json({
      success: true,
      message: "Team leader hired successfully",
      data: {
        ...responseData,
        businessData: savedBusinessData,
      },
    });
  } catch (error) {
    console.error("Error hiring team leader:", error);
    res.status(500).json({
      success: false,
      message: "Failed to hire team leader",
      error: error.message,
    });
  }
});

// Get team leader details
router.get("/fetch-data/:id", async (req, res) => {
    try {
        const { id } = req.params

        const teamLeader = await TeamLeaderEmployee.findById(id)
            .populate("businessData")
            .populate("referredBy", "name email")
            .select("-password")

        if (!teamLeader) {
            return res.status(404).json({
                success: false,
                message: "Team leader not found",
            })
        }

        res.json({
            success: true,
            data: teamLeader,
        })
    } catch (error) {
        console.error("Error fetching team leader:", error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch team leader details",
            error: error.message,
        })
    }
})

// Update team leader status
router.patch("/fetch-data/:id/status", async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        const updatedLeader = await TeamLeaderEmployee.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).select("-password")

        if (!updatedLeader) {
            return res.status(404).json({
                success: false,
                message: "Team leader not found",
            })
        }

        res.json({
            success: true,
            message: "Team leader status updated successfully",
            data: updatedLeader,
        })
    } catch (error) {
        console.error("Error updating team leader status:", error)
        res.status(500).json({
            success: false,
            message: "Failed to update team leader status",
            error: error.message,
        })
    }
})

// Get team leader statistics
router.get("/team-leaders-stats", async (req, res) => {
    try {
        const totalLeaders = await TeamLeaderEmployee.countDocuments({ status: "active" })
        const activeLeaders = await TeamLeaderEmployee.countDocuments({ status: "active" })
        
        const teamLeaders = await TeamLeaderEmployee.find({ status: "active" })
            .populate("businessData")
            .select("name businessData")

        const totalTeamSize = teamLeaders.reduce((sum, leader) => 
            sum + (leader.businessData?.teamSize || 0), 0
        )
        
        const totalMonthlyTarget = teamLeaders.reduce((sum, leader) => 
            sum + (leader.businessData?.monthlyTarget || 0), 0
        )

        res.json({
            success: true,
            data: {
                totalLeaders,
                activeLeaders,
                totalTeamSize,
                totalMonthlyTarget,
                averageTeamSize: totalLeaders > 0 ? Math.round(totalTeamSize / totalLeaders) : 0,
                averageTarget: totalLeaders > 0 ? Math.round(totalMonthlyTarget / totalLeaders) : 0
            }
        })
    } catch (error) {
        console.error("Error fetching team leader stats:", error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch team leader statistics",
            error: error.message,
        })
    }
})

module.exports = router