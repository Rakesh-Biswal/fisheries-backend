const express = require("express");
const router = express.Router();

// Simple test route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Team Leader Meetings route is working!"
  });
});

// Get all meetings for Team Leader
router.get("/fetch-all", (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: "Team Leader meetings fetched successfully"
    });
  } catch (error) {
    console.error("❌ Error fetching Team Leader meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings"
    });
  }
});

// Prepare invited departments with their employees
const invitedDepartments = [];

for (const deptId of departments) {
  const departmentModel = DEPARTMENT_MODELS[deptId];
  if (!departmentModel) continue;

  // Get all active employees from this department
  const departmentEmployees = await departmentModel.find({ 
    status: 'active' 
  }).select('_id name email empCode').lean();

  invitedDepartments.push({
    department: deptId,
    departmentName: DEPARTMENT_NAMES[deptId],
    invitedEmployees: departmentEmployees.map(emp => ({
      employeeId: emp._id,
      name: emp.name,
      email: emp.email || emp.companyEmail,
      empCode: emp.empCode,
      status: 'pending'
    }))
  });
}

// Always include HR department
if (!departments.includes('hr')) {
  const hrEmployees = await mongoose.model('HrEmployee').find({ 
    status: 'active',
    _id: { $ne: employeeId } // Exclude the organizer
  }).select('_id name companyEmail empCode').lean();

  // ✅ FIX: Make sure we're actually getting HR employees
  console.log("🔍 HR Employees found:", hrEmployees.length);
  
  invitedDepartments.push({
    department: 'hr',
    departmentName: 'Human Resources',
    invitedEmployees: hrEmployees.map(emp => ({
      employeeId: emp._id,
      name: emp.name,
      email: emp.companyEmail, // Use companyEmail for HR
      empCode: emp.empCode,
      status: 'pending'
    }))
  });
}

module.exports = router;