const express = require("express")
const bcrypt = require("bcryptjs")
const TeamLeaderEmployee = require("../../models/TEAMLEADER/TeamLeaderEmployee")
const TeamLeaderBusinessData = require("../../models/TEAMLEADER/TeamLeaderBusinessData")
const Team = require("../../models/TEAMLEADER/TeamSchema")
const HrEmployee = require("../../models/HR/HrEmployee")
const SalesEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee")
const authenticateToken = require("./HrAuthMiddlewear");

const router = express.Router()

// Get all team leaders
router.get("/team-leader/fetch-data", async (req, res) => {
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


router.get("/team-leader/profile/:id", async (req, res) => {
  try {
    const { id } = req.params

    const projectManager = await TeamLeaderEmployee.findById(id)
      .populate("businessData")
      .populate("referredBy", "name email")
      .select("-password")

    if (!projectManager) {
      return res.status(404).json({
        success: false,
        message: "Team Leader not found",
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

// Create new team
router.post("/teams/create", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      leader,
      region,
      project,
      performanceScore,
      notes
    } = req.body

    // Validate required fields
    if (!name || !leader) {
      return res.status(400).json({
        success: false,
        message: "Team name and leader are required"
      })
    }

    // Check if team name already exists
    const existingTeam = await Team.findOne({ name })
    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: "Team with this name already exists"
      })
    }

    // Create new team
    const newTeam = new Team({
      name,
      description: description || "",
      createdBy: req.user.id,
      leader,
      region: region || null,
      project: project || null,
      performanceScore: performanceScore || null,
      notes: notes || null,
      workers: [] // Start with empty workers array
    })

    const savedTeam = await newTeam.save()

    // Populate the leader details for response
    await savedTeam.populate('leader', 'name email phone photo')
    await savedTeam.populate('createdBy', 'name email')

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: savedTeam
    })

  } catch (error) {
    console.error("Error creating team:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create team",
      error: error.message
    })
  }
})

// Get all teams
router.get("/teams/fetch", authenticateToken, async (req, res) => {
  try {
    const teams = await Team.find({ status: "active" })
      .populate('leader', 'name email phone photo')
      .populate('createdBy', 'name email')
      .populate('workers', 'name email phone')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: teams,
      count: teams.length
    })
  } catch (error) {
    console.error("Error fetching teams:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch teams",
      error: error.message
    })
  }
})



// Get team by ID
router.get("/teams/details/:id", authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('leader', 'name email phone photo')
      .populate('createdBy', 'name email')
      .populate('workers', 'name email phone photo designation status')

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      })
    }

    res.json({
      success: true,
      data: team
    })
  } catch (error) {
    console.error("Error fetching team:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch team",
      error: error.message
    })
  }
})

// Update team
router.put("/teams/details/update/:id", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      region,
      project,
      performanceScore,
      notes,
      status
    } = req.body

    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        region,
        project,
        performanceScore,
        notes,
        status,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('leader', 'name email phone photo')
     .populate('workers', 'name email phone photo designation status')

    if (!updatedTeam) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      })
    }

    res.json({
      success: true,
      message: "Team updated successfully",
      data: updatedTeam
    })
  } catch (error) {
    console.error("Error updating team:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update team",
      error: error.message
    })
  }
})

// Add employees to team
router.post("/teams/details/add-employee/:id/employees", authenticateToken, async (req, res) => {
  try {
    const { employeeIds } = req.body

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        message: "Employee IDs array is required"
      })
    }

    const team = await Team.findById(req.params.id)
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      })
    }

    // Add new employees (avoid duplicates)
    const newEmployees = employeeIds.filter(id => !team.workers.includes(id))
    team.workers.push(...newEmployees)

    const updatedTeam = await team.save()
    await updatedTeam.populate('workers', 'name email phone photo designation status')

    res.json({
      success: true,
      message: "Employees added to team successfully",
      data: updatedTeam
    })
  } catch (error) {
    console.error("Error adding employees to team:", error)
    res.status(500).json({
      success: false,
      message: "Failed to add employees to team",
      error: error.message
    })
  }
})

// Remove employee from team
router.delete("/teams/:id/employees/:employeeId", authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      })
    }

    team.workers = team.workers.filter(workerId => workerId.toString() !== req.params.employeeId)
    const updatedTeam = await team.save()
    await updatedTeam.populate('workers', 'name email phone photo designation status')

    res.json({
      success: true,
      message: "Employee removed from team successfully",
      data: updatedTeam
    })
  } catch (error) {
    console.error("Error removing employee from team:", error)
    res.status(500).json({
      success: false,
      message: "Failed to remove employee from team",
      error: error.message
    })
  }
})

// Get available employees (not in any team)
router.get("/teams/details/employees/available", authenticateToken, async (req, res) => {
  try {
    // This would need to query your SalesEmployee model
    // For now, returning a sample response structure
    const availableEmployees = await SalesEmployee.find({
      status: "active",
      _id: { $nin: await Team.distinct('workers') }
    }).select('name email phone photo designation status')

    res.json({
      success: true,
      data: availableEmployees
    })
  } catch (error) {
    console.error("Error fetching available employees:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch available employees",
      error: error.message
    })
  }
})

module.exports = router