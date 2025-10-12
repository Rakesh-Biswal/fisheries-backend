const express = require("express");
const mongoose = require("mongoose");
const Meeting = require("../../models/Meeting/Meeting");
const { authenticateToken } = require("./HrAuthMiddlewear");

// Import department models
const Ceo = require("../../models/CEO/CeoPi");
const CeoTask = require("../../models/CEO/CeoTask");
const AccountantEmployee = require("../../models/ACCOUNTANT/AccountantEmployee");

// (Add these only if you actually have these folders)
const TeamLeaderEmployee = require("../../models/TEAMLEADER/TeamLeaderEmployee");
const ProjectManagerEmployee = require("../../models/PROJECTMANAGER/ProjectManagerEmployee");
const TelecallerEmployee = require("../../models/TELECALLER/TelecallerEmployee");
const SalesEmployeeEmployee = require("../../models/SALESEMPLOYEE/SalesEmployeeEmployee");

const router = express.Router();

// Department mapping
const DEPARTMENT_MODELS = {
  ceo: Ceo,
  team_leader: TeamLeaderEmployee,
  project_manager: ProjectManagerEmployee,
  accountant: AccountantEmployee,
  telecaller: TelecallerEmployee,
  sales: SalesEmployeeEmployee
};

const DEPARTMENT_NAMES = {
  hr: 'Human Resources',
  ceo: 'Chief Executive Officer',
  team_leader: 'Team Leader',
  project_manager: 'Project Manager',
  accountant: 'Accountant',
  telecaller: 'Telecaller',
  sales: 'Sales'
};

/**
 * GET /api/hr/meetings/fetch-all - Get all meetings for HR
 */
router.get("/fetch-all", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      status, 
      date, 
      type, 
      department 
    } = req.query;

    // Build filter - HR can see meetings they organized or where HR department is invited
    let filter = {
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'invitedDepartments.department': 'hr' }
      ]
    };

    // Additional filters
    if (status) filter.status = status;
    if (date) filter['schedule.date'] = date;
    if (type) filter.meetingType = type;
    if (department) filter['invitedDepartments.department'] = department;

    const meetings = await Meeting.find(filter)
      .sort({ 'schedule.date': 1, 'schedule.startTime': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Meeting.countDocuments(filter);

    res.json({
      success: true,
      data: meetings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error("❌ Error fetching HR meetings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/hr/meetings/create - Create new meeting as HR
 */
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, name, companyEmail, empCode } = req.user;
    
    if (req.user.role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const {
      title,
      description,
      agenda,
      schedule,
      platform,
      meetingLink,
      location,
      departments, // Array of department IDs to invite
      meetingType,
      priority
    } = req.body;

    // Validation
    if (!title?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Meeting title is required" 
      });
    }

    if (!schedule?.date || !schedule?.startTime || !schedule?.endTime) {
      return res.status(400).json({ 
        success: false, 
        message: "Complete meeting schedule is required" 
      });
    }

    if (platform !== 'in_person' && !meetingLink) {
      return res.status(400).json({ 
        success: false, 
        message: "Meeting link is required for virtual meetings" 
      });
    }

    if (!departments || departments.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one department is required" 
      });
    }

    console.log("🔍 DEBUG: Raw departments from frontend:", departments);
    console.log("🔍 DEBUG: Type of departments:", typeof departments);

    // Build organizer info
    const organizer = {
      employeeId: employeeId,
      name: name,
      email: companyEmail,
      empCode: empCode,
      designation: 'HR Executive'
    };

    // Prepare invited departments with their employees
    const invitedDepartments = [];
    const allParticipants = []; // This will populate the participants array
    
    // Process departments - handle both string IDs and objects
    const departmentIds = Array.isArray(departments) 
      ? departments.map(dept => {
          if (typeof dept === 'object' && dept.id) {
            return dept.id; // Extract ID from object
          }
          return dept; // Already a string
        })
      : [];

    console.log("🔍 DEBUG: Processed department IDs:", departmentIds);

    // Add selected departments
    for (const deptId of departmentIds) {
      const departmentModel = DEPARTMENT_MODELS[deptId];
      if (!departmentModel) {
        console.log(`⚠️ Department model not found for: ${deptId}`);
        continue;
      }

      try {
        // Get all active employees from this department
        const departmentEmployees = await departmentModel.find({ 
          status: 'active' 
        }).select('_id name email companyEmail empCode').lean();

        console.log(`🔍 ${DEPARTMENT_NAMES[deptId]} Employees found:`, departmentEmployees.length);

        const employeesList = departmentEmployees.map(emp => ({
          employeeId: emp._id,
          name: emp.name,
          email: emp.email || emp.companyEmail, // Use both email fields
          empCode: emp.empCode,
          status: 'pending'
        }));

        // Add to participants array
        employeesList.forEach(emp => {
          allParticipants.push({
            employeeId: emp.employeeId,
            employeeModel: getEmployeeModelByDepartment(deptId),
            name: emp.name,
            email: emp.email,
            department: deptId,
            status: emp.status
          });
        });

        invitedDepartments.push({
          department: deptId,
          departmentName: DEPARTMENT_NAMES[deptId],
          invitedEmployees: employeesList
        });

      } catch (deptError) {
        console.error(`❌ Error fetching employees for ${deptId}:`, deptError);
        // Continue with other departments even if one fails
      }
    }

    // Always include HR department (even if no other HR employees exist)
    if (!departmentIds.includes('hr')) {
      try {
        const HrEmployee = mongoose.model('HrEmployee');
        const hrEmployees = await HrEmployee.find({ 
          status: 'active',
          _id: { $ne: employeeId } // Exclude the organizer
        }).select('_id name companyEmail empCode').lean();

        console.log("🔍 HR Employees found:", hrEmployees.length);

        // If no other HR employees found, at least include the organizer in invited list
        const hrEmployeesList = hrEmployees.length > 0 
          ? hrEmployees.map(emp => ({
              employeeId: emp._id,
              name: emp.name,
              email: emp.companyEmail,
              empCode: emp.empCode,
              status: 'pending'
            }))
          : [
              // Fallback: Include organizer as participant if no other HR employees
              {
                employeeId: employeeId,
                name: name,
                email: companyEmail,
                empCode: empCode,
                status: 'accepted' // Auto-accept for organizer
              }
            ];

        // Add HR employees to participants
        hrEmployeesList.forEach(emp => {
          allParticipants.push({
            employeeId: emp.employeeId,
            employeeModel: 'HrEmployee',
            name: emp.name,
            email: emp.email,
            department: 'hr',
            status: emp.status
          });
        });

        invitedDepartments.push({
          department: 'hr',
          departmentName: 'Human Resources',
          invitedEmployees: hrEmployeesList
        });

      } catch (hrError) {
        console.error("❌ Error fetching HR employees:", hrError);
        // Still add HR department with organizer as fallback
        const fallbackEmployee = {
          employeeId: employeeId,
          name: name,
          email: companyEmail,
          empCode: empCode,
          status: 'accepted'
        };

        allParticipants.push({
          employeeId: employeeId,
          employeeModel: 'HrEmployee',
          name: name,
          email: companyEmail,
          department: 'hr',
          status: 'accepted'
        });

        invitedDepartments.push({
          department: 'hr',
          departmentName: 'Human Resources',
          invitedEmployees: [fallbackEmployee]
        });
      }
    }

    console.log("✅ Final invited departments structure:", JSON.stringify(invitedDepartments, null, 2));
    console.log("✅ Participants to be added:", allParticipants.length);

    // Prepare meeting data
    const meetingData = {
      title: title.trim(),
      description: description?.trim() || '',
      agenda: agenda?.trim() || '',
      organizer: organizer,
      invitedDepartments: invitedDepartments,
      participants: allParticipants, // This was missing!
      schedule: schedule,
      platform: platform || 'google_meet',
      meetingLink: meetingLink || '',
      location: location || '',
      meetingType: meetingType || 'cross_department',
      priority: priority || 'medium',
      status: 'scheduled',
      notifications: {
        sentToDepartments: false
      }
    };

    const meeting = new Meeting(meetingData);
    const savedMeeting = await meeting.save();

    console.log("✅ Meeting created successfully with ID:", savedMeeting._id);
    console.log("✅ Participants count in saved meeting:", savedMeeting.participants.length);

    res.status(201).json({
      success: true,
      message: "Meeting created successfully and invitations sent to departments",
      data: savedMeeting
    });

  } catch (error) {
    console.error("❌ Error creating HR meeting:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create meeting",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Helper function to get employee model by department
 */
function getEmployeeModelByDepartment(department) {
  const modelMap = {
    hr: 'HrEmployee',
    ceo: 'Ceo',
    team_leader: 'TeamLeaderEmployee',
    project_manager: 'ProjectManagerEmployee',
    accountant: 'AccountantEmployee',
    telecaller: 'TelecallerEmployee',
    sales: 'SalesEmployeeEmployee'
  };
  return modelMap[department] || 'Employee';
}

/**
 * GET /api/hr/meetings/fetch-departments - Get available departments for HR
 */
router.get("/fetch-departments", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    // Get department counts for realistic data
    const departmentCounts = await Promise.all(
      Object.entries(DEPARTMENT_MODELS).map(async ([deptId, model]) => {
        try {
          const count = await model.countDocuments({ status: 'active' });
          return { deptId, count };
        } catch (error) {
          console.error(`❌ Error counting ${deptId}:`, error);
          return { deptId, count: 0 };
        }
      })
    );

    // Also get HR employee count
    let hrCount = 0;
    try {
      const HrEmployee = mongoose.model('HrEmployee');
      hrCount = await HrEmployee.countDocuments({ status: 'active' });
    } catch (error) {
      console.error("❌ Error counting HR employees:", error);
    }

    const departments = [
      { 
        id: 'hr', 
        name: 'Human Resources', 
        color: 'bg-purple-500',
        employeeCount: hrCount
      },
      { 
        id: 'ceo', 
        name: 'CEO', 
        color: 'bg-blue-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'ceo')?.count || 0
      },
      { 
        id: 'team_leader', 
        name: 'Team Leaders', 
        color: 'bg-green-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'team_leader')?.count || 0
      },
      { 
        id: 'project_manager', 
        name: 'Project Managers', 
        color: 'bg-orange-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'project_manager')?.count || 0
      },
      { 
        id: 'accountant', 
        name: 'Accountants', 
        color: 'bg-red-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'accountant')?.count || 0
      },
      { 
        id: 'telecaller', 
        name: 'Telecallers', 
        color: 'bg-indigo-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'telecaller')?.count || 0
      },
      { 
        id: 'sales', 
        name: 'Sales Team', 
        color: 'bg-cyan-500',
        employeeCount: departmentCounts.find(d => d.deptId === 'sales')?.count || 0
      }
    ];

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error("❌ Error fetching departments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ... (Keep all the other routes: fetch-stats, fetch-by-id, update, delete the same)

module.exports = router;