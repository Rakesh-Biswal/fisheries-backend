// backend/routes/HR/AttendanceDashboard.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../HrRoutes/HrAuthMiddlewear');
const Attendance = require('../../models/ATTENDANCE/Attendance');
const Holiday = require('../../models/HR/Holiday');

// Get all employees attendance for HR dashboard
router.get('/daily-attendance', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query;

        // Use provided date or today's date - FIXED DATE HANDLING
        let targetDate;
        if (date) {
            // Parse the date string properly to avoid timezone issues
            targetDate = new Date(date);
            // Set to start of day in local timezone to avoid UTC conversion issues
            targetDate.setHours(0, 0, 0, 0);
        } else {
            targetDate = new Date();
            targetDate.setHours(0, 0, 0, 0);
        }

        // Format date string for comparison (YYYY-MM-DD)
        const dateStr = targetDate.toISOString().split('T')[0];

        // Alternative approach: Use local date string to avoid timezone issues
        const localDateStr = formatDateToLocalString(targetDate);

        console.log('Query date:', date);
        console.log('Target date:', targetDate);
        console.log('Date string (ISO):', dateStr);
        console.log('Local date string:', localDateStr);

        // Get all employees first to check department-specific holidays
        const allEmployees = await getAllEmployees();

        // Check holidays for the SPECIFIC DATE - FIXED HOLIDAY QUERY
        const departmentHolidays = {};
        const allHolidays = await Holiday.find({
            date: dateStr // Use the exact date string from query
        }).lean();

        console.log('Found holidays for date:', dateStr, allHolidays);

        // Create a map of department holidays
        allEmployees.forEach(employee => {
            const employeeHoliday = allHolidays.find(holiday =>
                holiday.departments && holiday.departments.includes(employee.department.toLowerCase())
            );
            departmentHolidays[employee._id.toString()] = employeeHoliday;
        });

        // Define all employee models based on your enum
        const employeeModels = [
            { model: 'CeoEmployee', department: 'CEO' },
            { model: 'HrEmployee', department: 'HR' },
            { model: 'TeamLeaderEmployee', department: 'Team Leader' },
            { model: 'ProjectManagerEmployee', department: 'Project Manager' },
            { model: 'SalesEmployee', department: 'Sales Employee' },
            { model: 'TelecallerEmployee', department: 'Telecaller' },
            { model: 'AccountantEmployee', department: 'Accountant' }
        ];

        // Fetch attendance for all employee types for the target date
        const attendancePromises = employeeModels.map(async ({ model, department }) => {
            const attendanceRecords = await Attendance.find({
                employeeModel: model,
                date: targetDate // Use the targetDate object
            })
                .populate('employeeId', 'name email employeeId')
                .sort({ workModeOnTime: 1 })
                .lean();

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

                // Sales Employee specific fields
                ...(model === 'SalesEmployee' && {
                    totalDistance: record.totalDistanceTraveled || 0,
                })
            }));
        });

        const allAttendance = await Promise.all(attendancePromises);
        const flattenedAttendance = allAttendance.flat();

        // Merge attendance data with employee list
        const attendanceWithAbsent = allEmployees.map(employee => {
            const attendance = flattenedAttendance.find(a =>
                a.employeeId && a.employeeId.toString() === employee._id.toString()
            );

            const employeeHoliday = departmentHolidays[employee._id.toString()];

            if (attendance) {
                // If there's a holiday for this employee's department, override status
                if (employeeHoliday) {
                    return {
                        ...attendance,
                        status: 'Holiday',
                        holidayInfo: {
                            title: employeeHoliday.title,
                            description: employeeHoliday.description,
                            status: employeeHoliday.status,
                            date: employeeHoliday.date // Include the actual holiday date
                        }
                    };
                }
                return attendance;
            }

            // Employee without attendance record
            return {
                id: `absent-${employee._id}`,
                employeeId: employee._id,
                name: employee.name,
                role: employee.department,
                department: employee.department,
                isActive: false,
                startTime: null,
                endTime: null,
                totalHours: 0,
                status: employeeHoliday ? 'Holiday' : 'Absent',
                workType: null,
                requiresApproval: false,
                holidayInfo: employeeHoliday ? {
                    title: employeeHoliday.title,
                    description: employeeHoliday.description,
                    status: employeeHoliday.status,
                    date: employeeHoliday.date // Include the actual holiday date
                } : null
            };
        });

        // Calculate if any department has holiday today
        const hasAnyHoliday = allHolidays.length > 0;

        // Get the first holiday info for the banner
        let holidayBannerInfo = null;
        if (hasAnyHoliday && allHolidays[0]) {
            holidayBannerInfo = {
                title: allHolidays[0].title,
                description: allHolidays[0].description,
                departments: allHolidays[0].departments || [],
                date: allHolidays[0].date
            };
        }

        res.json({
            success: true,
            data: {
                date: targetDate,
                attendance: attendanceWithAbsent,
                summary: getAttendanceSummary(attendanceWithAbsent),
                isHoliday: hasAnyHoliday,
                holidayInfo: holidayBannerInfo
            }
        });

    } catch (error) {
        console.error('Error fetching HR attendance dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch attendance data'
        });
    }
});

// Get detailed attendance record
router.get('/attendance-details/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const attendance = await Attendance.findById(id)
            .populate('employeeId', 'name email employeeId phone department employeeModel')
            .populate('approvedBy', 'name email')
            .lean();

        if (!attendance) {
            return res.status(404).json({
                success: false,
                error: 'Attendance record not found'
            });
        }

        // Enhanced response with all details
        const detailedData = {
            _id: attendance._id,
            employeeInfo: {
                name: attendance.name || attendance.employeeId?.name,
                employeeId: attendance.employeeId?.employeeId,
                department: attendance.department,
                email: attendance.employeeId?.email,
                phone: attendance.employeeId?.phone,
                employeeModel: attendance.employeeId?.employeeModel
            },
            attendanceDetails: {
                date: attendance.date,
                workModeOnTime: attendance.workModeOnTime,
                workModeOffTime: attendance.workModeOffTime,
                totalWorkDuration: attendance.totalWorkDuration,
                status: attendance.status,
                workType: attendance.workType,
                description: attendance.description,
                totalDistanceTraveled: attendance.totalDistanceTraveled,
                remarks: attendance.remarks
            },
            locationData: {
                workModeOnLocation: attendance.workModeOnCoordinates ? {
                    latitude: attendance.workModeOnCoordinates.latitude,
                    longitude: attendance.workModeOnCoordinates.longitude,
                    address: await getAddressFromCoordinates(
                        attendance.workModeOnCoordinates.latitude,
                        attendance.workModeOnCoordinates.longitude
                    )
                } : null,
                workModeOffLocation: attendance.workModeOffCoordinates ? {
                    latitude: attendance.workModeOffCoordinates.latitude,
                    longitude: attendance.workModeOffCoordinates.longitude,
                    address: await getAddressFromCoordinates(
                        attendance.workModeOffCoordinates.latitude,
                        attendance.workModeOffCoordinates.longitude
                    )
                } : null
            },
            mediaData: {
                imageURL: attendance.ImageURL,
                hasImage: !!attendance.ImageURL
            },
            travelData: {
                travelLogs: attendance.travelLogs || [],
                totalLogs: attendance.travelLogs?.length || 0,
                totalDistance: attendance.totalDistanceTraveled || 0
            },
            approvalData: {
                approvedBy: attendance.approvedBy ? {
                    name: attendance.approvedBy.name,
                    email: attendance.approvedBy.email
                } : null,
                remarks: attendance.remarks,
                approvalDate: attendance.approvedBy ? attendance.updatedAt : null
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
            error: 'Failed to fetch attendance details'
        });
    }
});

// Helper function to format date to local string (YYYY-MM-DD)
function formatDateToLocalString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get address from coordinates
async function getAddressFromCoordinates(lat, lng) {
    try {
        // You can integrate with Google Maps Geocoding API here
        // For now, returning coordinates as string
        return `Lat: ${lat}, Lng: ${lng}`;
    } catch (error) {
        return `Lat: ${lat}, Lng: ${lng}`;
    }
}

// Approve attendance
router.put('/approve-attendance/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { finalStatus, remarks } = req.body;

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
        attendance.remarks = remarks;
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
            error: 'Failed to approve attendance'
        });
    }
});

// Update attendance status
router.put('/update-status/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;

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
        attendance.remarks = remarks;
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
            error: 'Failed to update attendance status'
        });
    }
});

// Helper function to get all employees from all departments
async function getAllEmployees() {
    try {
        const models = [
            { model: require('../../models/CEO/CeoPi'), department: 'CEO' },
            { model: require('../../models/HR/HrEmployee'), department: 'HR' },
            { model: require('../../models/TEAMLEADER/TeamLeaderEmployee'), department: 'Team Leader' },
            { model: require('../../models/PROJECTMANAGER/ProjectManagerEmployee'), department: 'Project Manager' },
            { model: require('../../models/SALESEMPLOYEE/SalesEmployeeEmployee'), department: 'Sales Employee' },
            { model: require('../../models/TELECALLER/TelecallerEmployee'), department: 'Telecaller' },
            { model: require('../../models/ACCOUNTANT/AccountantEmployee'), department: 'Accountant' }
        ];

        const employeePromises = models.map(async ({ model, department }) => {
            const employees = await model.find({ status: 'active' })
                .select('name email employeeId department')
                .lean();

            return employees.map(emp => ({
                ...emp,
                department: department
            }));
        });

        const allEmployees = await Promise.all(employeePromises);
        return allEmployees.flat();

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