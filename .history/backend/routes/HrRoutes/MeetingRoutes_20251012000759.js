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
      departments, // Array of department objects from frontend
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

    // ✅ FIXED: Process departments correctly - handle frontend format
    const departmentIds = [];
    
    for (const dept of departments) {
      if (typeof dept === 'object' && dept.department) {
        departmentIds.push(dept.department);
        console.log(`✅ Extracted department ID from object: ${dept.department}`);
      } else if (typeof dept === 'string') {
        departmentIds.push(dept);
        console.log(`✅ Using department ID as string: ${dept}`);
      } else if (typeof dept === 'object' && dept.id) {
        departmentIds.push(dept.id);
        console.log(`✅ Extracted department ID from object (id): ${dept.id}`);
      } else {
        console.log(`⚠️ Invalid department format:`, dept);
      }
    }

    console.log("🔍 DEBUG: Processed department IDs:", departmentIds);

    // If no valid departments found, return error
    if (departmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid departments found in the request"
      });
    }

    // Process EACH selected department
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
            // Still add the department with empty employees
            invitedDepartments.push({
              department: deptId,
              departmentName: DEPARTMENT_NAMES[deptId] || deptId,
              invitedEmployees: []
            });
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