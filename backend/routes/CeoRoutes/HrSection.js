const express = require("express");
const bcrypt = require("bcryptjs");
const HrEmployee = require("../../models/CEO/HrEmployee");
const HrBusinessData = require("../../models/CEO/HrBusinessData");
const ceoAuth = require("./CeoAuthMiddlewear");

const router = express.Router();

// Apply ceoAuth middleware to all routes in this file
// router.use(ceoAuth);

// Get HR dashboard data 
router.get("/dashboard", async (req, res) => {
  try {
    const hrEmployees = await HrEmployee.find({ status: "active" })
      .populate("businessData")
      .select("-password")
      .sort({ createdAt: -1 });

    const totalHr = hrEmployees.length;
    const newHiresThisMonth = await HrEmployee.countDocuments({
      status: "active",
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    });

    const totalEmployees = await HrEmployee.countDocuments({ status: "active" });
    const avgSalary = hrEmployees.length > 0 
      ? Math.round(hrEmployees.reduce((sum, emp) => sum + (emp.businessData?.salary || 0), 0) / hrEmployees.length)
      : 0;

    const turnoverRate = totalHr > 0 ? Math.floor(Math.random() * 5) + 2 : 0;
    const attendanceRate = totalHr > 0 ? Math.floor(Math.random() * 10) + 90 : 0;

    const trainingBudget = 45000;
    const trainingSpent = 32000;

    const metrics = {
      totalEmployees,
      newHires: newHiresThisMonth,
      turnoverRate,
      avgSalary,
      trainingBudget,
      trainingSpent,
      attendanceRate,
      satisfactionScore: totalHr > 0 ? Math.floor(Math.random() * 20) + 80 : 0,
    };

    res.json({
      success: true,
      data: {
        hrEmployees,
        metrics
      }
    });
  } catch (error) {
    console.error("Error fetching HR dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch HR dashboard data",
      error: error.message,
    });
  }
});

// Hire new HR employee
router.post("/hire-hr", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      aadhar,
      pan,
      photo,
      address,
      employeeType,
      department,
      joiningDate,
      salary,
      designation,
      emergencyContact,
      qualification,
      experience,
      expectedSalary,
    } = req.body;

    const existingHr = await HrEmployee.findOne({ companyEmail: email });
    if (existingHr) {
      return res.status(400).json({
        success: false,
        message: "HR with this email already exists",
      });
    }

    const empCode = `HR${Date.now().toString().slice(-6)}`;
    const hashedPassword = await bcrypt.hash(password, 12);

    const hrEmployee = new HrEmployee({
      name,
      phone,
      companyEmail: email,
      password: hashedPassword,
      aadhar,
      pan,
      emergencyContact: emergencyContact || "",
      address,
      qualification: qualification || "",
      experience: experience || 0,
      expectedSalary: expectedSalary || salary || 0,
      photo: photo || null,
      empCode,
      status: "active",
      role: "hr",
    });

    const savedHr = await hrEmployee.save();

    const hrBusinessData = new HrBusinessData({
      employeeId: savedHr._id,
      empCode,
      employeeType: employeeType || "full-time",
      department: department || "Human Resources",
      designation: designation || "HR Executive",
      joiningDate: joiningDate || new Date(),
      deptStatus: "active",
      attendanceSummary: null,
      salaryStructureId: null,
      probationPeriod: 6,
      reportingManager: null,
      salary: salary || 0,
    });

    const savedBusinessData = await hrBusinessData.save();

    savedHr.businessData = savedBusinessData._id;
    await savedHr.save();

    const responseData = savedHr.toObject();
    delete responseData.password;

    res.status(201).json({
      success: true,
      message: "HR employee hired successfully",
      data: {
        ...responseData,
        businessData: savedBusinessData,
      },
    });
  } catch (error) {
    console.error("Error hiring HR employee:", error);
    res.status(500).json({
      success: false,
      message: "Failed to hire HR employee",
      error: error.message,
    });
  }
});


// Get individual HR employee profile
router.get("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Find HR employee with business data
    const hrEmployee = await HrEmployee.findById(id)
    if (!hrEmployee) {
      return res.status(404).json({
        success: false,
        message: "HR employee not found",
      })
    }

    // Get business data for this employee
    const businessData = await HrBusinessData.findOne({ employeeId: id })

    // Combine employee and business data
    const profileData = {
      ...hrEmployee.toObject(),
      businessData: businessData || null,
      // Add calculated fields
      experienceYears: businessData
        ? Math.floor((new Date() - new Date(businessData.joiningDate)) / (365.25 * 24 * 60 * 60 * 1000))
        : 0,

      // Performance metrics (dummy data for now)
      performanceMetrics: {
        attendanceRate: 94.5,
        performanceScore: 8.7,
        teamSatisfaction: 9.2,
        completedTrainings: 12,
        certificationsEarned: 5,
      },

      // Recent activities (dummy data for now)
      recentActivities: [
        {
          id: 1,
          type: "training",
          title: "Completed Leadership Training",
          description: "Successfully completed advanced leadership certification program",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          icon: "award",
        },
        {
          id: 2,
          type: "team_building",
          title: "Conducted Team Building Session",
          description: "Organized and led team building activities for engineering department",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          icon: "users",
        },
        {
          id: 3,
          type: "process_improvement",
          title: "Improved Recruitment Process",
          description: "Implemented new screening process reducing hiring time by 30%",
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          icon: "trending-up",
        },
      ],
    }

    res.status(200).json({
      success: true,
      message: "HR employee profile fetched successfully",
      data: profileData,
    })
  } catch (error) {
    console.error("Error fetching HR profile:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

module.exports = router;
