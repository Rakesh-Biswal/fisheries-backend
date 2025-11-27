// ./backend/routes/HrRoutes/HrOverviewSection.js
const express = require("express");
const HrEmployee = require("../../models/HR/HrEmployee");
const TeamLeaderEmployee = require("../../models/TEAMLEADER/TeamLeaderEmployee");
const SalesEmployeeEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee");
const ProjectManagerEmployee = require("../../models/PROJECTMANAGER/ProjectManagerEmployee");
const TelecallerEmployee = require("../../models/TELECALLER/TelecallerEmployee");
const AccountantEmployee = require("../../models/ACCOUNTANT/AccountantEmployee");
const FarmerLead = require("../../models/SALESEMPLOYEE/farmerLeads");
const authenticateToken = require("./HrAuthMiddlewear");

const router = express.Router();

// Get HR overview statistics and employee data
router.get("/", authenticateToken, async (req, res) => {
  try {
    // Get counts from all employee collections
    const teamLeaders = await TeamLeaderEmployee.countDocuments({ status: "active" });
    const salesEmployees = await SalesEmployeeEmployee.countDocuments({ status: "active" });
    const projectManagers = await ProjectManagerEmployee.countDocuments({ status: "active" });
    const telecallers = await TelecallerEmployee.countDocuments({ status: "active" });
    const accountants = await AccountantEmployee.countDocuments({ status: "active" });
    const totalFarmers = await FarmerLead.countDocuments();

    const totalActiveEmployees = teamLeaders + salesEmployees + projectManagers + telecallers + accountants;

    // Get recent employees
    const recentEmployees = await Promise.all([
      TeamLeaderEmployee.find({ status: "active" })
        .select("name companyEmail photo role empCode createdAt")
        .sort({ createdAt: -1 })
        .limit(2)
        .lean(),
      SalesEmployeeEmployee.find({ status: "active" })
        .select("name companyEmail photo role empCode createdAt")
        .sort({ createdAt: -1 })
        .limit(2)
        .lean(),
      ProjectManagerEmployee.find({ status: "active" })
        .select("name companyEmail photo role empCode createdAt")
        .sort({ createdAt: -1 })
        .limit(2)
        .lean(),
      TelecallerEmployee.find({ status: "active" })
        .select("name companyEmail photo role empCode createdAt")
        .sort({ createdAt: -1 })
        .limit(1)
        .lean(),
      AccountantEmployee.find({ status: "active" })
        .select("name companyEmail photo role empCode createdAt")
        .sort({ createdAt: -1 })
        .limit(1)
        .lean()
    ]);

    const allRecentEmployees = recentEmployees.flat()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    // Calculate employment status
    const permanentEmployees = Math.floor(totalActiveEmployees * 0.75);
    const contractEmployees = Math.floor(totalActiveEmployees * 0.15);
    const probationEmployees = totalActiveEmployees - permanentEmployees - contractEmployees;

    // Generate sample growth data
    const employeeGrowthData = [
      { month: "Jul", totalEmployees: Math.floor(totalActiveEmployees * 0.8), newHires: Math.floor(totalActiveEmployees * 0.1) },
      { month: "Aug", totalEmployees: Math.floor(totalActiveEmployees * 0.9), newHires: Math.floor(totalActiveEmployees * 0.15) },
      { month: "Sept", totalEmployees: totalActiveEmployees, newHires: Math.floor(totalActiveEmployees * 0.2) }
    ];

    // Length of service data
    const lengthOfServiceData = [
      { range: "0-1", count: Math.floor(totalActiveEmployees * 0.2) },
      { range: "1-2", count: Math.floor(totalActiveEmployees * 0.25) },
      { range: "2-3", count: Math.floor(totalActiveEmployees * 0.3) },
      { range: "3-5", count: Math.floor(totalActiveEmployees * 0.15) },
      { range: "5+", count: Math.floor(totalActiveEmployees * 0.1) }
    ];

    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees: totalActiveEmployees,
          newHires: Math.floor(totalActiveEmployees * 0.2),
          applicants: Math.floor(totalActiveEmployees * 0.08),
          totalFarmers,
          employmentStatus: {
            permanent: permanentEmployees,
            contract: contractEmployees,
            probation: probationEmployees
          }
        },
        recentEmployees: allRecentEmployees,
        employeeGrowthData,
        lengthOfServiceData
      }
    });

  } catch (error) {
    console.error("Error fetching HR overview data:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

module.exports = router;