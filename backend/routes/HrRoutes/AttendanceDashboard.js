// backend/routes/HR/AttendanceDashboard.js - FIXED TIMEZONE ISSUE
const express = require('express');
const router = express.Router();
const authenticateToken = require('../HrRoutes/HrAuthMiddlewear');
const Attendance = require('../../models/ATTENDANCE/Attendance');
const Holiday = require('../../models/HR/Holiday');

// Department mapping from display names to enum values
const departmentMapping = {
    'CEO': 'ceo',
    'HR': 'hr',
    'Team Leader': 'team-leader',
    'Project Manager': 'project-manager',
    'Sales Employee': 'sales-employee',
    'Telecaller': 'telecaller',
    'Accountant': 'accountant'
};

// Reverse mapping from enum to display names
const reverseDepartmentMapping = {
    'ceo': 'CEO',
    'hr': 'HR',
    'team-leader': 'Team Leader',
    'project-manager': 'Project Manager',
    'sales-employee': 'Sales Employee',
    'telecaller': 'Telecaller',
    'accountant': 'Accountant'
};

// Helper function to get current date in IST (India Standard Time)
// Helper function to get current date in IST (Odisha/Kolkata timezone)
const getCurrentISTDate = () => {
    const now = new Date();
    
    // Convert to IST (UTC+5:30) - Odisha/Kolkata timezone
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    // Format as YYYY-MM-DD
    const year = istTime.getUTCFullYear();
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

// Helper function to format date to IST string (YYYY-MM-DD)
function formatDateToISTString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get all employees attendance for HR dashboard
router.get('/daily-attendance', authenticateToken, async (req, res) => {
    try {
       const { date } = req.query;

        console.log('Received date query:', date);

        // Handle date with IST timezone (India - UTC+5:30)
        let targetDate;
        let dateStr;
        
        if (date) {
            // Parse the provided date
            targetDate = new Date(date);
            dateStr = formatDateToISTString(targetDate);
        } else {
            // Get current date in IST
            dateStr = getCurrentISTDate();
            targetDate = new Date(dateStr);
        }

        console.log('Processing attendance for date:', dateStr);
        console.log('Target date object:', targetDate);
        console.log('Current IST date:', getCurrentISTDate());

        // Get all employees first to check department-specific holidays
        const allEmployees = await getAllEmployees();

        // Check holidays using exact date string comparison
        const departmentHolidays = {};
        const allHolidays = await Holiday.find({
            date: dateStr
        }).lean();

        console.log("Found holidays for date:", allHolidays.length);
        console.log("Holiday details:", allHolidays);

        // Create a map of department holidays - FIXED DEPARTMENT MAPPING
        allEmployees.forEach(employee => {
            const employeeDepartmentEnum = departmentMapping[employee.department];
            
            if (!employeeDepartmentEnum) {
                console.log(`No enum mapping found for department: ${employee.department}`);
                return;
            }

            // Find holiday that includes this employee's department
            const employeeHoliday = allHolidays.find(holiday =>
                holiday.departments && holiday.departments.includes(employeeDepartmentEnum)
            );
            
            if (employeeHoliday) {
                console.log(`Holiday found for ${employee.name} (${employee.department}):`, employeeHoliday.title);
            }
            
            departmentHolidays[employee._id.toString()] = employeeHoliday;
        });

        // Define all employee models based on your enum - UPDATED TO MATCH SCHEMA
        const employeeModels = [
            { model: 'CeoEmployee', department: 'CEO' },
            { model: 'HrEmployee', department: 'HR' },
            { model: 'TeamLeaderEmployee', department: 'Team Leader' },
            { model: 'ProjectManagerEmployee', department: 'Project Manager' },
            { model: 'SalesEmployeeEmployee', department: 'Sales Employee' }, // Fixed to match schema
            { model: 'TeleCallerEmployee', department: 'Telecaller' }, // Fixed to match schema
            { model: 'AccountantEmployee', department: 'Accountant' }
        ];

        // Fetch attendance for all employee types for the target date - USING DATE OBJECT
        const attendancePromises = employeeModels.map(async ({ model, department }) => {
            try {
                // Create date range for the day in IST
                const startOfDay = new Date(dateStr + 'T00:00:00+05:30');
                const endOfDay = new Date(dateStr + 'T23:59:59+05:30');

                const attendanceRecords = await Attendance.find({
                    employeeModel: model,
                    date: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                })
                    .populate('employeeId', 'name email employeeId phone department')
                    .sort({ workModeOnTime: 1 })
                    .lean();

                console.log(`Found ${attendanceRecords.length} records for ${department}`);

                return attendanceRecords.map(record => ({
                    // Common fields for all employees
                    id: record._id,
                    employeeId: record.employeeId?._id,
                    name: record.name || record.employeeId?.name || 'Unknown',
                    role: department,
                    department: record.department,
                    isActive: !record.workModeOffTime,
                    startTime: record.workModeOnTime,
                    endTime: record.workModeOffTime,
                    totalHours: record.totalWorkDuration || 0,
                    status: record.status || 'Absent',
                    workType: record.workType,
                    requiresApproval: record.status === 'AwaitingApproval',

                    // Location and image data
                    workModeOnCoordinates: record.workModeOnCoordinates,
                    workModeOffCoordinates: record.workModeOffCoordinates,
                    ImageURL: record.ImageURL,
                    travelLogs: record.travelLogs || [],

                    // Additional fields
                    totalDistanceTraveled: record.totalDistanceTravelled || 0,
                    description: record.description,
                    remarks: record.remarks
                }));
            } catch (error) {
                console.error(`Error fetching attendance for ${department}:`, error);
                return [];
            }
        });

        const allAttendance = await Promise.all(attendancePromises);
        const flattenedAttendance = allAttendance.flat();

        console.log("Total fetched attendance records:", flattenedAttendance.length);

        // Merge attendance data with employee list - FIXED HOLIDAY CHECK
        const attendanceWithAbsent = allEmployees.map(employee => {
            const attendance = flattenedAttendance.find(a =>
                a.employeeId && a.employeeId.toString() === employee._id.toString()
            );

            const employeeHoliday = departmentHolidays[employee._id.toString()];

            if (attendance) {
                // If there's a holiday for this employee's department, override status
                if (employeeHoliday) {
                    console.log(`Setting holiday status for ${employee.name} (${employee.department})`);
                    return {
                        ...attendance,
                        status: 'Holiday',
                        holidayInfo: {
                            title: employeeHoliday.title,
                            description: employeeHoliday.description,
                            status: employeeHoliday.status,
                            departments: employeeHoliday.departments,
                            date: employeeHoliday.date
                        }
                    };
                }
                return attendance;
            }

            // Employee without attendance record
            const baseRecord = {
                id: `absent-${employee._id}`,
                employeeId: employee._id,
                name: employee.name,
                role: employee.department,
                department: employee.department,
                isActive: false,
                startTime: null,
                endTime: null,
                totalHours: 0,
                workType: null,
                requiresApproval: false,
                workModeOnCoordinates: null,
                workModeOffCoordinates: null,
                ImageURL: null,
                travelLogs: [],
                totalDistanceTraveled: 0,
                description: null,
                remarks: null
            };

            if (employeeHoliday) {
                console.log(`Setting holiday status for absent employee ${employee.name} (${employee.department})`);
                return {
                    ...baseRecord,
                    status: 'Holiday',
                    holidayInfo: {
                        title: employeeHoliday.title,
                        description: employeeHoliday.description,
                        status: employeeHoliday.status,
                        departments: employeeHoliday.departments,
                        date: employeeHoliday.date
                    }
                };
            }

            return {
                ...baseRecord,
                status: 'Absent'
            };
        });

        // Calculate if any department has holiday today
        const hasAnyHoliday = allHolidays.length > 0;
        const primaryHoliday = allHolidays.length > 0 ? allHolidays[0] : null;

        // Get departments with holiday for the banner
        let holidayDepartments = [];
        if (primaryHoliday && primaryHoliday.departments) {
            holidayDepartments = primaryHoliday.departments.map(dept => 
                reverseDepartmentMapping[dept] || dept
            );
        }

        res.json({
            success: true,
            data: {
                date: dateStr,
                attendance: attendanceWithAbsent,
                summary: getAttendanceSummary(attendanceWithAbsent),
                isHoliday: hasAnyHoliday,
                holidayInfo: primaryHoliday ? {
                    title: primaryHoliday.title,
                    description: primaryHoliday.description,
                    departments: holidayDepartments,
                    date: primaryHoliday.date,
                    status: primaryHoliday.status
                } : null
            }
        });

    } catch (error) {
        console.error('Error fetching HR attendance dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch attendance data: ' + error.message
        });
    }
});

// Get detailed attendance record - FIXED DATA POPULATION
router.get('/attendance-details/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Fetching detailed attendance for ID:", id);

        // Handle absent records
        if (id.startsWith('absent-')) {
            return res.status(404).json({
                success: false,
                error: 'No attendance record found for this employee on the selected date'
            });
        }

        const attendance = await Attendance.findById(id)
            .populate('employeeId', 'name email employeeId phone department')
            .populate('approvedBy', 'name email')
            .lean();

        if (!attendance) {
            return res.status(404).json({
                success: false,
                error: 'Attendance record not found'
            });
        }

        console.log("Found attendance record:", {
            id: attendance._id,
            name: attendance.name,
            employeeId: attendance.employeeId,
            status: attendance.status
        });

        // Enhanced response with all details - FIXED DATA MAPPING
        const detailedData = {
            _id: attendance._id,
            employeeInfo: {
                name: attendance.name || attendance.employeeId?.name || 'Unknown',
                employeeId: attendance.employeeId?.employeeId || 'Not Available',
                department: attendance.department || attendance.employeeId?.department || 'Not Available',
                email: attendance.employeeId?.email || 'Not Available',
                phone: attendance.employeeId?.phone || 'Not Available',
                employeeModel: attendance.employeeModel || 'Not Available'
            },
            attendanceDetails: {
                date: attendance.date,
                workModeOnTime: attendance.workModeOnTime,
                workModeOffTime: attendance.workModeOffTime,
                totalWorkDuration: attendance.totalWorkDuration || 0,
                status: attendance.status || 'Not Available',
                workType: attendance.workType || 'Not Specified',
                description: attendance.description || 'No description provided',
                totalDistanceTraveled: attendance.totalDistanceTravelled || 0,
                remarks: attendance.remarks || 'No remarks'
            },
            locationData: {
                workModeOnLocation: attendance.workModeOnCoordinates ? {
                    latitude: attendance.workModeOnCoordinates.latitude,
                    longitude: attendance.workModeOnCoordinates.longitude,
                    address: await getAddressFromCoordinates(
                        attendance.workModeOnCoordinates.latitude,
                        attendance.workModeOnCoordinates.longitude
                    ),
                    timestamp: attendance.workModeOnTime
                } : null,
                workModeOffLocation: attendance.workModeOffCoordinates ? {
                    latitude: attendance.workModeOffCoordinates.latitude,
                    longitude: attendance.workModeOffCoordinates.longitude,
                    address: await getAddressFromCoordinates(
                        attendance.workModeOffCoordinates.latitude,
                        attendance.workModeOffCoordinates.longitude
                    ),
                    timestamp: attendance.workModeOffTime
                } : null
            },
            mediaData: {
                imageURL: attendance.ImageURL,
                hasImage: !!attendance.ImageURL
            },
            travelData: {
                travelLogs: attendance.travelLogs || [],
                totalLogs: attendance.travelLogs?.length || 0,
                totalDistance: attendance.totalDistanceTravelled || 0
            },
            approvalData: {
                approvedBy: attendance.approvedBy ? {
                    name: attendance.approvedBy.name,
                    email: attendance.approvedBy.email
                } : null,
                remarks: attendance.remarks || 'No remarks',
                approvalDate: attendance.approvedBy ? attendance.updatedAt : null,
                status: attendance.status
            },
            systemData: {
                createdAt: attendance.createdAt,
                updatedAt: attendance.updatedAt
            }
        };

        res.json({
            success: true,
            data: detailedData
        });

    } catch (error) {
        console.error('Error fetching attendance details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch attendance details: ' + error.message
        });
    }
});

// Helper function to get address from coordinates
async function getAddressFromCoordinates(lat, lng) {
    try {
        if (!lat || !lng) return 'Location not available';
        
        // For India Odisha location, you can use a reverse geocoding service
        // For now, returning formatted coordinates
        return `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`;
        
        // Uncomment to use actual geocoding service:
        /*
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        return data.display_name || `Latitude: ${lat}, Longitude: ${lng}`;
        */
    } catch (error) {
        return `Latitude: ${lat}, Longitude: ${lng}`;
    }
}

// Approve attendance
router.put('/approve-attendance/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { finalStatus, remarks } = req.body;

        // Handle absent records
        if (id.startsWith('absent-')) {
            return res.status(400).json({
                success: false,
                error: 'Cannot approve absent records - no attendance data available'
            });
        }

        const attendance = await Attendance.findById(id);

        if (!attendance) {
            return res.status(404).json({
                success: false,
                error: 'Attendance record not found'
            });
        }

        // Update attendance status
        attendance.status = finalStatus || 'Approved';
        attendance.approvedBy = req.user._id;
        attendance.remarks = remarks || 'Approved by HR';
        attendance.updatedAt = new Date();

        await attendance.save();

        res.json({
            success: true,
            message: 'Attendance approved successfully',
            data: attendance
        });

    } catch (error) {
        console.error('Error approving attendance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve attendance: ' + error.message
        });
    }
});

// Update attendance status
router.put('/update-status/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;

        // Handle absent records
        if (id.startsWith('absent-')) {
            return res.status(400).json({
                success: false,
                error: 'Cannot update status for absent records'
            });
        }

        const validStatuses = [
            "Present", "Half Day", "Leave", "Absent",
            "Late Arrival", "Early Leave", "Approved", "Rejected"
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status provided'
            });
        }

        const attendance = await Attendance.findById(id);

        if (!attendance) {
            return res.status(404).json({
                success: false,
                error: 'Attendance record not found'
            });
        }

        // Update attendance status
        attendance.status = status;
        attendance.approvedBy = req.user._id;
        attendance.remarks = remarks || `Status updated to ${status} by HR`;
        attendance.updatedAt = new Date();

        await attendance.save();

        res.json({
            success: true,
            message: 'Attendance status updated successfully',
            data: attendance
        });

    } catch (error) {
        console.error('Error updating attendance status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update attendance status: ' + error.message
        });
    }
});

// Helper function to get all employees from all departments - FIXED MODEL NAMES
async function getAllEmployees() {
    try {
        const models = [
            { model: require('../../models/CEO/CeoPi'), department: 'CEO' },
            { model: require('../../models/HR/HrEmployee'), department: 'HR' },
            { model: require('../../models/TEAMLEADER/TeamLeaderEmployee'), department: 'Team Leader' },
            { model: require('../../models/PROJECTMANAGER/ProjectManagerEmployee'), department: 'Project Manager' },
            { model: require('../../models/SALESEMPLOYEE/SalesEmployeeEmployee'), department: 'Sales Employee' }, // Fixed
            { model: require('../../models/TELECALLER/TelecallerEmployee'), department: 'Telecaller' }, // Fixed
            { model: require('../../models/ACCOUNTANT/AccountantEmployee'), department: 'Accountant' }
        ];

        const employeePromises = models.map(async ({ model, department }) => {
            try {
                const employees = await model.find({ status: 'active' })
                    .select('name email employeeId department phone')
                    .lean();

                console.log(`Found ${employees.length} employees for ${department}`);

                return employees.map(emp => ({
                    ...emp,
                    department: department
                }));
            } catch (error) {
                console.error(`Error fetching employees for ${department}:`, error);
                return [];
            }
        });

        const allEmployees = await Promise.all(employeePromises);
        const flattened = allEmployees.flat();
        
        console.log(`Total employees found: ${flattened.length}`);
        return flattened;

    } catch (error) {
        console.error('Error fetching all employees:', error);
        return [];
    }
}

// Helper function to calculate attendance summary
function getAttendanceSummary(attendance) {
    const totalEmployees = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
    const halfDay = attendance.filter(a => a.status === 'Half Day').length;
    const earlyLeave = attendance.filter(a => a.status === 'Early Leave').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const active = attendance.filter(a => a.isActive).length;
    const awaitingApproval = attendance.filter(a => a.requiresApproval).length;
    const holiday = attendance.filter(a => a.status === 'Holiday').length;

    return {
        totalEmployees,
        present,
        halfDay,
        earlyLeave,
        absent,
        active,
        awaitingApproval,
        holiday,
        presentPercentage: totalEmployees > 0 ? ((present / totalEmployees) * 100).toFixed(1) : '0.0'
    };
}

module.exports = router;