// backend/routes/TeamLeaderRoutes/teams.js
const express = require('express');
const router = express.Router();
const Team = require('../../models/TEAMLEADER/TeamSchema');
const SalesEmployeeEmployee = require('../../models/SALESEMPLOYEE/SalesEmployeeEmployee');
const TLAuth = require('./TeamLeaderAuthMiddlewear');

// Get team leader's team with sales employees
router.get('/my-team', TLAuth, async (req, res) => {
    try {
        const teamLeaderId = req.tl.id;

        // Find the team where this team leader is assigned as leader
        const team = await Team.findOne({
            leader: teamLeaderId,
            status: "active"
        })
            .populate('leader', 'name companyEmail phone photo')
            .populate('workers', 'name companyEmail phone photo empCode status role qualification experience createdAt')
            .populate('createdBy', 'name companyEmail');

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'No team assigned to you yet'
            });
        }

        // Get team statistics
        const totalWorkers = team.workers.length;
        const activeWorkers = team.workers.filter(worker => worker.status === 'active').length;
        const inactiveWorkers = team.workers.filter(worker => worker.status === 'inactive').length;

        res.json({
            success: true,
            data: {
                team: {
                    _id: team._id,
                    name: team.name,
                    description: team.description,
                    leader: team.leader,
                    createdBy: team.createdBy,
                    region: team.region,
                    project: team.project,
                    performanceScore: team.performanceScore,
                    status: team.status,
                    createdAt: team.createdAt
                },
                workers: team.workers,
                statistics: {
                    totalWorkers,
                    activeWorkers,
                    inactiveWorkers
                }
            }
        });
    } catch (error) {
        console.error('Error fetching team data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team data'
        });
    }
});

// Get specific sales employee details
router.get('/employee/:employeeId', TLAuth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const teamLeaderId = req.tl.id;

        // Verify that this employee belongs to team leader's team
        const team = await Team.findOne({
            leader: teamLeaderId,
            workers: employeeId
        });

        if (!team) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this employee'
            });
        }

        const employee = await SalesEmployeeEmployee.findById(employeeId)
            .select('-password')
            .populate('businessData')
            .populate('referredBy', 'name companyEmail');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            data: employee
        });
    } catch (error) {
        console.error('Error fetching employee details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee details'
        });
    }
});

// Update sales employee status (activate/deactivate)
router.patch('/employee/:employeeId/status', TLAuth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { status } = req.body;
        const teamLeaderId = req.tl.id;

        // Validate status
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "active" or "inactive"'
            });
        }

        // Verify that this employee belongs to team leader's team
        const team = await Team.findOne({
            leader: teamLeaderId,
            workers: employeeId
        });

        if (!team) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this employee'
            });
        }

        const employee = await SalesEmployeeEmployee.findByIdAndUpdate(
            employeeId,
            {
                status,
                updatedAt: new Date()
            },
            { new: true }
        ).select('-password');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            message: `Employee status updated to ${status}`,
            data: employee
        });
    } catch (error) {
        console.error('Error updating employee status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update employee status'
        });
    }
});

module.exports = router;