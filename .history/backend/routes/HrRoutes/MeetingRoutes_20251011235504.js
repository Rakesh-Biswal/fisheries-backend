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
 * POST /api/hr/meetings/create - Create new meeting as HR (FIXED VERSION)
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
      departments, // Array of department objects/IDs from frontend
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

    console.log("🔍 DEBUG: Raw departments from frontend:", JSON.stringify(departments, null, 2));

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
    const allParticipants = [];

    // FIX: Process departments correctly - handle both objects and strings
    const departmentIds = [];
    
    for (const dept of departments) {
      if (typeof dept === 'object' && dept.id) {
        departmentIds.push(dept.id);
        console.log(`✅ Extracted department ID from object: ${dept.id}`);
      } else if (typeof dept === 'string') {
        departmentIds.push(dept);
        console.log(`✅ Using department ID as string: ${dept}`);
      } else {
        console.log(`⚠️ Invalid department format:`, dept);
      }
    }

    console.log("🔍 DEBUG: Processed department IDs:", departmentIds);

    // Process EACH selected department (including non-HR departments)
    for (const deptId of departmentIds) {
      console.log(`🔄 Processing department: ${deptId}`);

      // SPECIAL CASE: HR department
      if (deptId === 'hr') {
        try {
          const HrEmployee = mongoose.model('HrEmployee');
          const hrEmployees = await HrEmployee.find({ 
            status: 'active',
            _id: { $ne: employeeId } // Exclude the organizer
          }).select('_id name companyEmail empCode').lean();

          console.log(`🔍 HR Employees found: ${hrEmployees.length}`);

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
                  status: 'accepted'
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
          // Fallback with organizer
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
      // PROCESS OTHER DEPARTMENTS (CEO, Team Leader, etc.)
      else {
        const departmentModel = DEPARTMENT_MODELS[deptId];
        if (!departmentModel) {
          console.log(`❌ Department model not found for: ${deptId}`);
          console.log(`❌ Available models: ${Object.keys(DEPARTMENT_MODELS).join(', ')}`);
          continue;
        }

        try {
          // Get all active employees from THIS department (CEO, Team Leader, etc.)
          const departmentEmployees = await departmentModel.find({ 
            status: 'active' 
          }).select('_id name email companyEmail empCode').lean();

          console.log(`✅ ${DEPARTMENT_NAMES[deptId]} Employees found: ${departmentEmployees.length}`);

          if (departmentEmployees.length === 0) {
            console.log(`⚠️ No active employees found in ${deptId} department`);
            continue;
          }

          const employeesList = departmentEmployees.map(emp => ({
            employeeId: emp._id,
            name: emp.name,
            email: emp.email || emp.companyEmail,
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
            departmentName: DEPARTMENT_NAMES[deptId] || deptId,
            invitedEmployees: employeesList
          });

          console.log(`✅ Successfully added ${departmentEmployees.length} employees from ${deptId}`);

        } catch (deptError) {
          console.error(`❌ Error fetching employees for ${deptId}:`, deptError);
          // Continue with other departments even if one fails
        }
      }
    }

    // FIX: Only add HR department if NOT already included and at least one other department was selected
    if (!departmentIds.includes('hr') && departmentIds.length > 0) {
      console.log("🔄 Adding HR department as organizer...");
      try {
        const HrEmployee = mongoose.model('HrEmployee');
        const hrEmployees = await HrEmployee.find({ 
          status: 'active',
          _id: { $ne: employeeId }
        }).select('_id name companyEmail empCode').lean();

        const hrEmployeesList = hrEmployees.length > 0 
          ? hrEmployees.map(emp => ({
              employeeId: emp._id,
              name: emp.name,
              email: emp.companyEmail,
              empCode: emp.empCode,
              status: 'pending'
            }))
          : [];

        // Add organizer as participant for HR department meetings
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
          invitedEmployees: hrEmployeesList.length > 0 ? hrEmployeesList : [
            {
              employeeId: employeeId,
              name: name,
              email: companyEmail,
              empCode: empCode,
              status: 'accepted'
            }
          ]
        });

      } catch (hrError) {
        console.error("❌ Error adding HR department:", hrError);
      }
    }

    console.log("✅ Final invited departments:", JSON.stringify(invitedDepartments, null, 2));
    console.log("✅ Total participants:", allParticipants.length);

    // Prepare meeting data
    const meetingData = {
      title: title.trim(),
      description: description?.trim() || '',
      agenda: agenda?.trim() || '',
      organizer: organizer,
      invitedDepartments: invitedDepartments,
      participants: allParticipants,
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

    console.log("✅ Meeting created successfully!");
    console.log("✅ Meeting ID:", savedMeeting._id);
    console.log("✅ Departments invited:", savedMeeting.invitedDepartments.map(d => d.department));
    console.log("✅ Total participants saved:", savedMeeting.participants.length);

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

/**
 * GET /api/hr/meetings/fetch-stats - Get HR meeting statistics
 */
router.get("/fetch-stats", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get meetings organized by this HR or where HR is invited
    const stats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { 'organizer.employeeId': employeeId },
            { 'invitedDepartments.department': 'hr' }
          ]
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Today's meetings
    const todaysMeetings = await Meeting.countDocuments({
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'invitedDepartments.department': 'hr' }
      ],
      'schedule.date': today,
      status: { $in: ['scheduled', 'in_progress'] }
    });

    // Upcoming meetings (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingMeetings = await Meeting.countDocuments({
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'invitedDepartments.department': 'hr' }
      ],
      'schedule.date': { 
        $gte: today, 
        $lte: nextWeek.toISOString().split('T')[0] 
      },
      status: 'scheduled'
    });

    // Department-wise meeting count
    const departmentStats = await Meeting.aggregate([
      {
        $match: {
          $or: [
            { 'organizer.employeeId': employeeId },
            { 'invitedDepartments.department': 'hr' }
          ]
        }
      },
      { $unwind: '$invitedDepartments' },
      {
        $group: {
          _id: '$invitedDepartments.department',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      total: stats.reduce((acc, curr) => acc + curr.count, 0),
      today: todaysMeetings,
      upcoming: upcomingMeetings,
      byStatus: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byDepartment: departmentStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error("❌ Error fetching HR meeting stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/hr/meetings/fetch-by-id/:id - Get specific meeting details
 */
router.get("/fetch-by-id/:id", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { id } = req.params;

    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    const meeting = await Meeting.findOne({
      _id: id,
      $or: [
        { 'organizer.employeeId': employeeId },
        { 'invitedDepartments.department': 'hr' }
      ]
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or access denied"
      });
    }

    res.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    console.error("❌ Error fetching meeting details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meeting details",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * PUT /api/hr/meetings/update/:id - Update meeting
 */
router.put("/update/:id", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { id } = req.params;

    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    // Only allow organizer to update
    const meeting = await Meeting.findOneAndUpdate(
      { 
        _id: id, 
        'organizer.employeeId': employeeId 
      },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or you are not the organizer"
      });
    }

    res.json({
      success: true,
      message: "Meeting updated successfully",
      data: meeting
    });
  } catch (error) {
    console.error("❌ Error updating meeting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meeting",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * DELETE /api/hr/meetings/delete/:id - Cancel meeting
 */
router.delete("/delete/:id", authenticateToken, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { id } = req.params;

    if (role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required."
      });
    }

    // Only allow organizer to cancel
    const meeting = await Meeting.findOneAndUpdate(
      { 
        _id: id, 
        'organizer.employeeId': employeeId 
      },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or you are not the organizer"
      });
    }

    res.json({
      success: true,
      message: "Meeting cancelled successfully",
      data: meeting
    });
  } catch (error) {
    console.error("❌ Error cancelling meeting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel meeting",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;